// The full Entry Point's selection policy.
//
// Validation by change must be deterministic and versioned: the same changed
// tree under the same policy selects the same checks over the same scopes. This
// module is the whole of that policy's execution: it reads the versioned policy,
// establishes the change and its dependents, decides which checks apply, and
// keeps the budget and periodic decisions apart from the execution in
// run-mode.mjs, so a reviewer can read the decision without reading a tool log.
//
// The policy is executable, not a Guide: thresholds, costs, cadences and impact
// patterns live in harness/policy.json, and the code below only gives them
// meaning.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";
import { run } from "./lib.mjs";

export const MODE = Object.freeze({ change: "change", integral: "integral" });
export const POLICY_PATH = "harness/policy.json";
export const CHANGE_RECORD = "reports/change-selection.json";
export const INTEGRAL_RECORD = "reports/integral-status.json";

const CADENCES = new Set(["change", "periodic"]);
const SCOPES = new Set(["affected-files", "whole", "changed"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);

// A check's label for a report. Most checks are named after their Gate; the
// Mutation Gate has a reduced-scope and a periodic check, so those two name
// themselves.
export function checkName(check) {
  return check.name ?? check.gate;
}

// Turns a policy glob into the pattern the code matches paths with. `**` spans
// directories, `*` and `?` stop at a separator, and a `**/` prefix also matches
// the repository root, so `**/*.md` finds `README.md`.
function globToRegExp(glob) {
  let source = "";
  for (let index = 0; index < glob.length; index++) {
    const character = glob[index];
    if (character === "*" && glob[index + 1] === "*") {
      if (glob[index + 2] === "/") {
        source += "(?:[^/]+/)*";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
      continue;
    }
    if (character === "*") {
      source += "[^/]*";
      continue;
    }
    if (character === "?") {
      source += "[^/]";
      continue;
    }
    source += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

export function matchesAny(path, patterns) {
  return (patterns ?? []).some((pattern) => globToRegExp(pattern).test(path));
}

// Reads and validates the versioned policy. A policy that cannot be executed is
// a setup failure of the Entry Point, not a finding of a Gate.
export function loadPolicy(path = POLICY_PATH) {
  let policy;
  try {
    policy = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { problems: [`${path} cannot be read as JSON: ${error.message}`] };
  }
  const problems = [];
  if (!Number.isInteger(policy.version) || policy.version < 1) {
    problems.push(`${path}: version must be a positive integer`);
  }
  if (!Number.isFinite(policy.budgetSeconds) || policy.budgetSeconds <= 0) {
    problems.push(`${path}: budgetSeconds must be a positive number`);
  }
  if (typeof policy.baseBranch !== "string" || policy.baseBranch === "") {
    problems.push(`${path}: baseBranch is required`);
  }
  for (const field of ["sourceTrees", "sharedPaths", "checks"]) {
    if (!Array.isArray(policy[field])) problems.push(`${path}: ${field} must be an array`);
  }
  const targets = new Set();
  for (const [index, check] of (policy.checks ?? []).entries()) {
    const where = `${path}: checks[${index}]`;
    for (const field of ["gate", "target", "tier"]) {
      if (typeof check[field] !== "string" || check[field] === "") {
        problems.push(`${where}.${field} is required`);
      }
    }
    if (!CADENCES.has(check.cadence)) {
      problems.push(`${where}.cadence must be one of ${[...CADENCES].join(", ")}`);
    }
    if (!Number.isFinite(check.costSeconds) || check.costSeconds < 0) {
      problems.push(`${where}.costSeconds must be a non-negative number`);
    }
    if (!Array.isArray(check.impact)) problems.push(`${where}.impact must be an array`);
    if (check.cadence === "change" && !SCOPES.has(check.scope)) {
      problems.push(`${where}.scope must be one of ${[...SCOPES].join(", ")}`);
    }
    if (check.name !== undefined && typeof check.name !== "string") {
      problems.push(`${where}.name must be a string when it is set`);
    }
    if (targets.has(check.target)) problems.push(`${where}.target "${check.target}" is repeated`);
    targets.add(check.target);
  }
  return problems.length > 0 ? { problems } : { policy };
}

// The files policy and Git agree are part of this project's source, and so the
// nodes the dependency graph can place.
function sourceFiles(policy) {
  const result = run("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    ...policy.sourceTrees,
  ]);
  if (result.status !== 0) {
    return { reason: "the source files cannot be listed" };
  }
  return {
    files: result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

function normalise(path) {
  return path.split("\\").join("/").replace(/^\.\//, "");
}

function isCode(path) {
  return CODE_EXTENSIONS.has(path.slice(path.lastIndexOf(".")));
}

// Static imports, read from the syntax tree rather than from the text: import
// code inside a string literal is not a dependency, and counting it would widen
// every change to a file that quotes one.
function importSpecifiers(text, path) {
  const scriptKind =
    path.endsWith(".mjs") || path.endsWith(".cjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind);
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

// Resolves a relative import the way this stack does: the source imports the
// compiled extension (`./x.js`), the file on disk is `./x.ts`. A specifier that
// resolves nowhere is reported instead of being treated as external, because a
// dependency the graph cannot see is exactly the case where independence must
// not be assumed.
function resolveSpecifier(from, specifier) {
  if (!specifier.startsWith(".")) return { external: true };
  const base = normalise(join(dirname(from), specifier));
  const withoutExtension = base.replace(/\.(js|mjs|cjs|jsx)$/, "");
  const candidates = [
    base,
    `${withoutExtension}.ts`,
    `${withoutExtension}.tsx`,
    `${withoutExtension}.mts`,
    `${withoutExtension}.cts`,
    `${withoutExtension}.mjs`,
    `${withoutExtension}.cjs`,
    `${withoutExtension}.js`,
    join(withoutExtension, "index.ts"),
    join(withoutExtension, "index.js"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  return found === undefined ? { unresolved: true } : { path: normalise(found) };
}

// The reverse dependency graph over the policy's source trees: which files
// would need re-verification when another file changes.
export function dependencyGraph(policy) {
  const listed = sourceFiles(policy);
  if (listed.files === undefined) return { reason: listed.reason };
  const nodes = new Set(listed.files.map(normalise));
  const dependents = new Map();
  // An import of a file that is gone is how a deletion still has dependents:
  // the specifier names a base the graph can match against the deleted path.
  const dangling = new Map();
  const unresolved = [];
  for (const node of nodes) {
    if (!isCode(node)) continue;
    let text;
    try {
      text = readFileSync(node, "utf8");
    } catch {
      return { reason: `${node} cannot be read` };
    }
    for (const specifier of importSpecifiers(text, node)) {
      const resolved = resolveSpecifier(node, specifier);
      if (resolved.external) continue;
      if (resolved.unresolved) {
        const base = normalise(join(dirname(node), specifier)).replace(/\.(js|mjs|cjs|jsx)$/, "");
        if (!dangling.has(base)) dangling.set(base, new Set());
        dangling.get(base).add(node);
        unresolved.push({
          importer: node,
          base,
          message: `${node} imports "${specifier}", which the dependency graph cannot place`,
        });
        continue;
      }
      if (!dependents.has(resolved.path)) dependents.set(resolved.path, new Set());
      dependents.get(resolved.path).add(node);
    }
  }
  return { nodes, dependents, dangling, unresolved };
}

// The change and the files that depend on it. A file the graph cannot place, or
// a specifier that resolves nowhere, widens rather than narrows: missing
// information about impact is not evidence of independence.
export function affectedBy(policy, changed) {
  const graph = dependencyGraph(policy);
  if (graph.nodes === undefined) {
    return { affected: [...changed].sort(), reason: graph.reason };
  }
  const affected = new Set(changed);
  const queue = [...changed];
  while (queue.length > 0) {
    const path = queue.pop();
    // A deleted file is no longer a graph node, but the importers whose
    // specifier named it still are.
    const deletedBase = path.replace(/\.(ts|tsx|mts|cts|js|mjs|cjs)$/, "");
    const next = [
      ...(graph.dependents.get(path) ?? []),
      ...(existsSync(path) ? [] : (graph.dangling.get(deletedBase) ?? [])),
    ];
    for (const dependent of next) {
      if (affected.has(dependent)) continue;
      affected.add(dependent);
      queue.push(dependent);
    }
  }
  // An import that resolves nowhere is an uncertainty only when its importer is
  // affected and the missing target is not simply a file this change deleted.
  const deletedBases = new Set(
    changed
      .filter((path) => !existsSync(path))
      .map((path) => path.replace(/\.(ts|tsx|mts|cts|js|mjs|cjs)$/, "")),
  );
  const reason = graph.unresolved.find(
    (entry) => affected.has(entry.importer) && !deletedBases.has(entry.base),
  )?.message;
  return { affected: [...affected].sort(), reason };
}

function scopeFiles(check, affected) {
  // A scoped check that does not name its own scope verifies the same files
  // whose change makes it apply. A deleted file has nothing left to verify, and
  // handing it to the tool would make every deletion fail for the wrong reason;
  // its dependents, which still exist, carry the effect.
  return affected.filter(
    (path) =>
      existsSync(path) &&
      matchesAny(path, check.scopeMatch ?? check.impact) &&
      !matchesAny(path, check.scopeExclude ?? []),
  );
}

function noInput(check) {
  return `no affected ${check.scopeDescription ?? "input"}`;
}

// The checks validation by change runs, the ones it reports instead, and the
// periodic ones it leaves to integral validation. Pure: the same policy and the
// same change always give the same plan.
export function planChange(policy, changed) {
  const periodic = policy.checks
    .filter((check) => check.cadence === "periodic")
    .map((check) => ({ check }));
  if (changed.reason !== undefined) {
    return {
      changed: [],
      affected: [],
      widened: changed.reason,
      periodic,
      ...widenSelection(policy),
    };
  }
  const affectedResult = affectedBy(policy, changed.paths);
  const affected = affectedResult.affected;
  const shared = changed.paths.filter((path) => matchesAny(path, policy.sharedPaths));
  // A changed file no check consumes is an impact the policy cannot establish:
  // it may configure anything, so it widens rather than quietly running the
  // checks whose inputs it does not appear in.
  const unmatched = changed.paths.filter(
    (path) =>
      !matchesAny(path, policy.sharedPaths) &&
      !policy.checks.some((check) => matchesAny(path, check.impact)),
  );
  const reasons = [
    ...(shared.length > 0
      ? [`shared configuration or dependency changed: ${shared.join(", ")}`]
      : []),
    ...(unmatched.length > 0
      ? [`${unmatched.join(", ")} match no check's impact, so their reach is unknown`]
      : []),
    ...(affectedResult.reason === undefined ? [] : [affectedResult.reason]),
  ];
  const widened = reasons.length > 0 ? reasons.join("; ") : null;
  const plan = widened === null ? { executed: [], notApplicable: [] } : widenSelection(policy);
  if (widened === null) {
    for (const check of policy.checks) {
      if (check.cadence !== "change") continue;
      if (!affected.some((path) => matchesAny(path, check.impact))) {
        plan.notApplicable.push(notApplicable(check));
        continue;
      }
      if (check.scope === "affected-files") {
        const files = scopeFiles(check, affected);
        if (files.length === 0) {
          plan.notApplicable.push(notApplicable(check));
          continue;
        }
        plan.executed.push({ check, scope: files });
      } else {
        plan.executed.push({ check, scope: check.scope });
      }
    }
  }
  return {
    changed: changed.paths,
    affected,
    widened,
    ...plan,
    periodic,
    estimatedSeconds: costOf(plan.executed),
  };
}

function notApplicable(check) {
  return { gate: check.gate, check: checkName(check), reason: noInput(check) };
}

function costOf(executed) {
  return executed.reduce((total, entry) => total + entry.check.costSeconds, 0);
}

// A widened selection is not narrowed by a dependency graph that just proved
// unreliable: every applicable check sees its whole input. A check whose scope
// is its own changed set keeps it, because the wider selection does not make
// that check's changed-set selection any less what it computes; the periodic
// whole-input check stays integral-only.
export function widenSelection(policy) {
  const executed = policy.checks
    .filter((check) => check.cadence === "change")
    .map((check) => ({
      check,
      scope: check.scope === "changed" ? "changed" : "whole",
    }));
  return { executed, notApplicable: [], estimatedSeconds: costOf(executed) };
}

// Integral validation runs every Gate over its whole input. Where a Gate has a
// periodic check, that check is the integral one: the reduced-scope check is
// reported as superseded rather than run twice.
export function planIntegral(policy) {
  const periodicGates = new Set(
    policy.checks.filter((check) => check.cadence === "periodic").map((check) => check.gate),
  );
  const executed = [];
  const superseded = [];
  for (const check of policy.checks) {
    if (check.cadence === "periodic") {
      executed.push({ check, scope: "whole" });
    } else if (periodicGates.has(check.gate)) {
      superseded.push({ gate: check.gate, check: checkName(check) });
    } else {
      executed.push({ check, scope: "whole" });
    }
  }
  return { executed, superseded, estimatedSeconds: costOf(executed) };
}

// Whether a periodic failure reaches this change. The failed check's own record
// wins; without one its impact pattern decides. Neither available means the
// relationship is uncertain, which requires wider validation rather than an
// assumed-independent green result.
export function periodicIndependence(policy, failure, affected) {
  if (Array.isArray(failure.failedFiles) && failure.failedFiles.length > 0) {
    return affected.some((path) => failure.failedFiles.includes(path)) ? "affected" : "independent";
  }
  const check = policy.checks.find((candidate) => checkName(candidate) === failure.check);
  if (check === undefined || check.impact.length === 0) return "uncertain";
  return affected.some((path) => matchesAny(path, check.impact)) ? "affected" : "independent";
}
