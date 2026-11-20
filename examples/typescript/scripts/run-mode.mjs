// The Entry Points. `make check-fast` runs `fast`; `make check` runs `change`
// (validation by change) or, with MODE=integral, `integral`. The selection
// policy is harness/policy.json; this script only applies it and reports.
//
// Exit status: 0 green, 1 a check failed (or a periodic failure in scope),
// 3 inconclusive (the required validation exceeds the budget; nothing ran).
// make reports any non-zero status as its own; reports/validation.json keeps
// the outcome.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { changedFiles } from "./changes.mjs";
import { runCheck } from "./gates.mjs";
import { git } from "./lib.mjs";
import { cost, plan, policyVersion } from "./selection.mjs";

const mode = process.argv[2];
if (!["fast", "change", "integral"].includes(mode)) {
  console.error(`unknown mode "${String(mode)}": use fast, change, or integral`);
  process.exit(2);
}

const POLICY_FILE = "harness/policy.json";
const policyText = readFileSync(POLICY_FILE, "utf8");
const policy = JSON.parse(policyText);
const version = policyVersion(policyText, policy);
const integralFile = process.env.HARNESS_INTEGRAL_STATUS ?? "reports/integral-status.json";

function dependencyGraph() {
  const result = spawnSync(
    "node_modules/.bin/depcruise",
    [
      "--config",
      ".dependency-cruiser.graph.cjs",
      "--output-type",
      "json",
      ...policy.dependencyRoots,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) return undefined;
  const graph = new Map();
  for (const module of JSON.parse(result.stdout).modules) {
    const local = module.dependencies.filter(
      (d) => !d.coreModule && !d.couldNotResolve && !d.resolved.startsWith("node_modules/"),
    );
    graph.set(
      module.source,
      local.map((d) => d.resolved),
    );
  }
  return graph;
}

function readIntegral() {
  if (!existsSync(integralFile)) return undefined;
  try {
    return JSON.parse(readFileSync(integralFile, "utf8"));
  } catch {
    return undefined;
  }
}

function buildPlan() {
  if (mode === "fast") {
    const entries = policy.checks
      .filter((check) => check.tier === "fast")
      .map((check) => ({ check, decision: "run", scope: "whole" }));
    return {
      widened: "the fast Entry Point runs every fast check over its whole input",
      affected: null,
      entries,
    };
  }
  if (mode === "integral") return plan("integral", policy, null, null, null);
  const base = process.env.HARNESS_BASE ?? policy.base;
  const changed = changedFiles(base, git);
  const change = changed.widened
    ? changed
    : { ...changed, deleted: changed.files.filter((file) => !existsSync(file)) };
  const result = plan(
    "change",
    policy,
    change,
    change.widened ? undefined : dependencyGraph(),
    readIntegral(),
  );
  return { ...result, base: changed.base ?? base, changed: changed.files ?? null };
}

const scopeText = (scope) => (Array.isArray(scope) ? scope.join(", ") : scope);

function execute(selected) {
  let failed;
  for (const entry of selected.entries) {
    if (entry.decision !== "run") continue;
    if (failed) {
      entry.outcome = "not run";
      continue;
    }
    console.log(`\n▶ ${entry.check.gate} [${entry.check.id}] over ${scopeText(entry.scope)}`);
    entry.outcome = runCheck(entry.check, entry.scope) ? "passed" : "failed";
    if (entry.outcome === "failed") failed = entry;
  }
  return failed;
}

function summarize(selected, outcome, failed) {
  console.log(
    `\n── ${mode === "fast" ? "fast Entry Point" : `full Entry Point, ${mode === "change" ? "validation by change" : "integral validation"}`} (policy ${version})`,
  );
  if (selected.widened) console.log(`   scope widened: ${selected.widened}`);
  else console.log(`   affected scope: ${selected.affected.join(", ") || "(empty)"}`);
  for (const entry of selected.entries) {
    const { gate, id } = entry.check;
    if (entry.decision === "run")
      console.log(
        `   ${entry.outcome ?? "not started"}: ${gate} [${id}] over ${scopeText(entry.scope)}`,
      );
    else if (entry.decision === "not-applicable")
      console.log(`   not applicable: ${gate} [${id}] (no affected input)`);
    else if (entry.decision === "covered")
      console.log(`   covered: ${gate} [${id}] (${entry.reason})`);
    else {
      const last = entry.last;
      const when = last.at ? ` at ${last.at} on ${last.commit}` : "";
      console.log(
        `   periodic, not run: ${gate} [${id}]; last integral result: ${last.outcome}${when}`,
      );
      if (entry.blocking)
        console.log(
          `   ✘ its last integral run failed and this change verifies files in its scope`,
        );
    }
  }
  if (failed) console.log(`   ✘ failed: ${failed.check.gate} [${failed.check.id}]`);
  const claim =
    outcome === "passed" && mode === "change"
      ? "green over the scope listed above only; this is not integral verification"
      : outcome;
  console.log(`   result: ${claim}`);
}

function writeReport(selected, outcome, failed) {
  mkdirSync("reports", { recursive: true });
  const report = {
    mode,
    policyVersion: version,
    commit: git(["rev-parse", "HEAD"]) ?? null,
    finishedAt: new Date().toISOString(),
    base: selected.base ?? null,
    changed: selected.changed ?? null,
    widened: selected.widened,
    affected: selected.affected,
    outcome,
    failed: failed ? { id: failed.check.id, gate: failed.check.gate } : null,
    checks: selected.entries.map(({ check, ...entry }) => ({
      id: check.id,
      gate: check.gate,
      ...entry,
    })),
  };
  writeFileSync(
    `reports/${mode === "fast" ? "fast" : "validation"}.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (mode === "integral") {
    const checks = Object.fromEntries(
      selected.entries.filter((e) => e.decision === "run").map((e) => [e.check.id, e.outcome]),
    );
    writeFileSync(
      integralFile,
      `${JSON.stringify({ policyVersion: version, commit: report.commit, finishedAt: report.finishedAt, outcome, checks }, null, 2)}\n`,
    );
  }
}

const selected = buildPlan();

if (mode === "change" && cost(selected.entries) > policy.budgetSeconds) {
  const required = cost(selected.entries);
  summarize(selected, "inconclusive");
  console.log(
    `   ⚠ inconclusive: the required validation is estimated at ${String(required)} s, beyond the ${String(policy.budgetSeconds)} s budget in ${POLICY_FILE}. No check was started, so ${selected.widened ? "the whole project" : "the affected scope above"} is unverified. To proceed, approve a larger budget in ${POLICY_FILE} or run make check MODE=integral.`,
  );
  writeReport(selected, "inconclusive");
  process.exit(3);
}

const failed = execute(selected);
const blocking = selected.entries.find((entry) => entry.blocking);
const outcome = failed || blocking ? "failed" : "passed";
summarize(selected, outcome, failed ?? blocking);
writeReport(selected, outcome, failed ?? blocking);
process.exit(outcome === "passed" ? 0 : 1);
