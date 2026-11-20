// Validation by change: which checks run, over which scope. Pure functions of
// the policy, the change, and the dependency graph, so equivalent changes
// under the same policy select the same checks over the same scopes.
import { createHash } from "node:crypto";

const SOURCE = /\.(ts|mts|mjs|cjs|js)$/;

/** Turns a policy glob (`**`, `*`) into an anchored regular expression. */
export function globToRegExp(glob) {
  let pattern = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      pattern += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") pattern += "[^/]*";
    else pattern += /[.+?^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
  }
  return new RegExp(`^${pattern}$`);
}

export function matchesAny(file, globs) {
  return globs.some((glob) => globToRegExp(glob).test(file));
}

export function policyVersion(text, policy) {
  return `${String(policy.version)}+sha256:${createHash("sha256").update(text).digest("hex").slice(0, 12)}`;
}

/** Files that depend on any of `files`, transitively, from a module -> dependencies map. */
export function dependents(files, graph) {
  const reverse = new Map();
  for (const [module, deps] of graph) {
    for (const dep of deps) {
      if (!reverse.has(dep)) reverse.set(dep, new Set());
      reverse.get(dep).add(module);
    }
  }
  const seen = new Set(files);
  const queue = [...files];
  while (queue.length > 0) {
    for (const parent of reverse.get(queue.shift()) ?? []) {
      if (!seen.has(parent)) {
        seen.add(parent);
        queue.push(parent);
      }
    }
  }
  return [...seen].filter((file) => !files.includes(file)).sort();
}

/**
 * Why the change's impact cannot be reduced, or undefined when it can.
 * `change` is `{ files, deleted }` or `{ widened }`; `graph` is a Map, or
 * undefined when the dependency information could not be built.
 */
export function wideningReason(change, policy, graph) {
  if (change.widened) return `impact unknown: ${change.widened}`;
  const shared = change.files.filter((file) => matchesAny(file, policy.sharedConfiguration));
  if (shared.length > 0) return `shared configuration changed: ${shared.join(", ")}`;
  if (graph === undefined) return "impact unknown: the dependency graph could not be built";
  const inRoots = (file) =>
    SOURCE.test(file) && policy.dependencyRoots.some((root) => file.startsWith(`${root}/`));
  const deleted = change.files.filter((file) => inRoots(file) && change.deleted.includes(file));
  if (deleted.length > 0)
    return `impact unknown: deleted modules have no place in the graph: ${deleted.join(", ")}`;
  const unplaced = change.files.filter((file) => inRoots(file) && !graph.has(file));
  if (unplaced.length > 0) return `impact unknown: the graph cannot place ${unplaced.join(", ")}`;
  return undefined;
}

function lastIntegral(check, integral) {
  const result = integral?.checks?.[check.id];
  if (result === undefined) return { outcome: "not recorded" };
  return {
    outcome: result,
    at: integral.finishedAt,
    commit: integral.commit,
    policyVersion: integral.policyVersion,
  };
}

/**
 * The plan for one mode. Each entry is `{ check, decision, scope }` where
 * decision is "run", "not-applicable", "periodic", or "covered", and scope is
 * "whole", "changed", or a file list.
 */
export function plan(mode, policy, change, graph, integral) {
  if (mode === "integral") {
    return {
      widened: "integral validation runs every check over its whole input",
      affected: null,
      entries: policy.checks.map((check) =>
        check.integral
          ? { check, decision: "covered", reason: check.integral }
          : { check, decision: "run", scope: "whole" },
      ),
    };
  }
  const widened = wideningReason(change, policy, graph);
  const affected = widened
    ? null
    : [...new Set([...change.files, ...dependents(change.files, graph)])].sort();
  const entries = policy.checks.map((check) => {
    if (check.cadence === "periodic") {
      const last = lastIntegral(check, integral);
      const inScope =
        affected === null || affected.some((file) => matchesAny(file, check.appliesTo));
      return { check, decision: "periodic", last, blocking: last.outcome === "failed" && inScope };
    }
    if (widened) return { check, decision: "run", scope: "whole" };
    const files = affected.filter((file) => matchesAny(file, check.appliesTo));
    if (files.length === 0) return { check, decision: "not-applicable" };
    if (check.scope === "affected") return { check, decision: "run", scope: files };
    return { check, decision: "run", scope: check.scope };
  });
  return { widened: widened ?? null, affected, entries };
}

export function cost(entries) {
  return entries
    .filter((entry) => entry.decision === "run")
    .reduce((sum, entry) => sum + entry.check.costSeconds, 0);
}
