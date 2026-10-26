// The full Entry Point's two modes.
//
// `make check` runs validation by change: the policy selects the applicable
// checks and their scopes, dependents included, and the result states what it
// verified. `make check MODE=integral` runs every Gate over its whole input,
// including the checks the policy assigns to periodic execution.
//
// The report keeps five things apart, because a green result must never read as
// more than it is: the checks that ran and their scopes, the checks that did not
// apply, the checks left to periodic execution, failures, and an inconclusive
// result. A required validation wider than the approved budget is inconclusive
// and non-zero, and no check is started for it.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { changedPathsSince, headCommit, resolveComparison } from "./git-changes.mjs";
import { MUTATION_SCOPE_RECORD, readScopeRecord } from "./mutation-scope.mjs";
import {
  MODE,
  loadPolicy,
  planChange,
  planIntegral,
  periodicIndependence,
  widenSelection,
} from "./selection.mjs";

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const CHANGE_RECORD = "reports/change-selection.json";
const INTEGRAL_RECORD = "reports/integral-status.json";

const mode = process.argv[2] ?? MODE.change;
if (mode !== MODE.change && mode !== MODE.integral) {
  console.error(`usage: node scripts/run-mode.mjs ${MODE.change}|${MODE.integral}`);
  process.exit(2);
}

const loaded = loadPolicy();
if (loaded.policy === undefined) {
  console.error("✘ Selection policy");
  for (const problem of loaded.problems) console.error(`  ${problem}`);
  process.exit(1);
}
const policy = loaded.policy;

// Runs one check with the scope the plan gave it. A check that narrows reads
// HARNESS_SCOPE; leaving it unset is what tells the check to verify its whole
// input. Output is inherited so the Gate names itself in the Entry Point, which
// is what a Gate Proof attributes a red result to.
function runCheck(entry) {
  if (entry.check.target.startsWith("mutation")) {
    // An earlier run's scope record must not be read as this run's evidence.
    rmSync(MUTATION_SCOPE_RECORD, { force: true });
  }
  const environment = {
    ...process.env,
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    HARNESS_MODE: mode,
    HARNESS_POLICY_VERSION: String(policy.version),
  };
  if (Array.isArray(entry.scope)) environment.HARNESS_SCOPE = JSON.stringify(entry.scope);
  else delete environment.HARNESS_SCOPE;
  const started = Date.now();
  const result = spawnSync(NPM, ["run", "--silent", entry.check.target], {
    stdio: "inherit",
    env: environment,
  });
  return {
    exitCode: result.status ?? 1,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
}

function writeRecord(path, record) {
  mkdirSync("reports", { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

// The check a widened entry actually runs. A Gate Proof declares its eligible
// input for one execution, and that declaration replaces the changed-set
// selection, so it also wins over a policy widening of the same Gate: the proof
// must reach the Gate's ordinary analysis, not a whole-codebase run the
// declaration cannot narrow.
function executable(entry) {
  if (entry.narrow !== undefined && process.env.MUTATION_SCOPE !== undefined) {
    return { check: entry.narrow, scope: "changed" };
  }
  return { check: entry.check, scope: entry.scope };
}

function describeScope(scope) {
  if (Array.isArray(scope)) {
    return `${scope.length} affected file(s)`;
  }
  return scope === "changed" ? "the check's own changed set" : "whole input";
}

function readIntegralStatus() {
  try {
    return { record: JSON.parse(readFileSync(INTEGRAL_RECORD, "utf8")) };
  } catch {
    return { record: null };
  }
}

function failedFilesOf(check) {
  if (!check.gate.startsWith("Mutation")) return null;
  const { record } = readScopeRecord();
  return record?.analyzedFiles ?? null;
}

// Validation by change.
function changeValidation() {
  const base = process.env.HARNESS_BASE ?? policy.baseBranch;
  const comparison = resolveComparison(base);
  const changed =
    comparison.commit === undefined
      ? { reason: comparison.reason }
      : changedPathsSince(comparison.commit);
  let plan = planChange(policy, changed);

  const status = readIntegralStatus();
  const periodic = plan.periodic.map((entry) => {
    const result = status.record?.results?.find(
      (candidate) => candidate.check === entry.check.name,
    );
    const failure = status.record?.failed?.find(
      (candidate) => candidate.check === entry.check.name,
    );
    const last =
      status.record === null || result === undefined
        ? { state: "not-recorded" }
        : failure === undefined
          ? { state: "passed" }
          : { state: "failed", commit: status.record.commit };
    return { ...entry, last, failure };
  });

  let relationOf = () => "independent";
  if (comparison.commit === undefined) {
    // The change itself could not be established, so no relationship to a
    // failure can be established either.
    relationOf = () => "uncertain";
  } else if (plan.widened !== null) {
    // A widened selection cannot establish independence from anything: the
    // change reaches every input the periodic check covers.
    relationOf = () => "affected";
  } else {
    relationOf = (failure) => periodicIndependence(policy, failure, plan.affected);
  }
  const periodicFailures = periodic
    .filter((entry) => entry.last.state === "failed")
    .map((entry) => ({
      gate: entry.check.gate,
      check: entry.check.name,
      commit: entry.last.commit,
      relation: relationOf(entry.failure),
    }));
  for (const failure of periodicFailures) failure.independent = failure.relation === "independent";

  const relations = new Set(periodicFailures.map((failure) => failure.relation));
  if (relations.has("uncertain") && plan.widened === null) {
    plan = {
      ...plan,
      ...widenSelection(policy),
      widened: "a periodic integral failure's relationship to this change is uncertain",
    };
  }

  const record = {
    mode: MODE.change,
    policyVersion: policy.version,
    base,
    baseCommit: comparison.commit ?? null,
    changed: plan.changed,
    affected: plan.affected,
    widened: plan.widened ?? null,
    budgetSeconds: policy.budgetSeconds,
    estimatedSeconds: plan.estimatedSeconds,
    executed: [],
    notApplicable: plan.notApplicable,
    periodic: periodic.map((entry) => ({
      gate: entry.check.gate,
      check: entry.check.name,
      lastResult: entry.last.state,
      commit: entry.last.commit ?? null,
    })),
    periodicFailures,
    failures: [],
    inconclusive: null,
    outcome: null,
    integralVerification: false,
  };

  console.log(`Harness: validation by change (policy v${policy.version})`);
  if (comparison.commit === undefined) {
    console.log(`Base: ${base} — ${comparison.reason}`);
    console.log("Changed: unknown; the wider selection is reported below");
  } else {
    console.log(`Base: ${base} (${comparison.commit.slice(0, 12)})`);
    console.log(`Changed: ${plan.changed.length} file(s)`);
    console.log(`Affected (with dependents): ${plan.affected.length} file(s)`);
  }
  console.log(`Widened: ${plan.widened ?? "no"}`);
  console.log(`Budget: ${policy.budgetSeconds}s approved, ${plan.estimatedSeconds}s required`);

  console.log("Periodic (not run in change validation):");
  if (periodic.length === 0) console.log("  none");
  for (const entry of periodic) {
    const where =
      entry.last.state === "not-recorded"
        ? "last integral result: not recorded"
        : entry.last.state === "passed"
          ? "last integral result: passed"
          : `last integral result: failed (${entry.last.commit.slice(0, 12)})`;
    const relation =
      entry.last.state === "failed"
        ? `; ${periodicFailures.find((failure) => failure.check === entry.check.name).relation === "independent" ? "independent of this change" : "in this change's scope"}`
        : "";
    console.log(`  ${entry.check.name} — ${where}${relation}`);
  }

  console.log("Not applicable:");
  if (plan.notApplicable.length === 0) console.log("  none");
  for (const entry of plan.notApplicable) {
    console.log(`  ${entry.check} — ${entry.reason}`);
  }

  if (periodicFailures.some((failure) => failure.relation === "affected")) {
    for (const failure of periodicFailures.filter((entry) => entry.relation === "affected")) {
      record.failures.push(
        `periodic check "${failure.check}" failed at ${failure.commit} and this change verifies files in its scope`,
      );
    }
    record.outcome = "red";
    writeRecord(CHANGE_RECORD, record);
    console.log("Failures:");
    for (const failure of record.failures) console.log(`  ${failure}`);
    console.log(
      "Result: red — a periodic integral failure in this change's scope requires treatment before the change can report green. No check was started.",
    );
    return 1;
  }

  if (plan.estimatedSeconds > policy.budgetSeconds) {
    record.inconclusive = {
      reason: `required validation (${plan.executed.length} check(s), ${plan.estimatedSeconds}s) exceeds the approved budget of ${policy.budgetSeconds}s`,
    };
    record.outcome = "inconclusive";
    writeRecord(CHANGE_RECORD, record);
    console.log("Inconclusive:");
    console.log(`  ${record.inconclusive.reason}; no check was started.`);
    console.log(
      "Result: INCONCLUSIVE — the wider validation this change requires was not run; no Gate may be reported green for it.",
    );
    return 3;
  }

  if (plan.executed.length === 0) {
    console.log("Executed: none");
  } else {
    console.log("Executed:");
    for (const entry of plan.executed) {
      const chosen = executable(entry);
      console.log(`  ${chosen.check.name} — scope: ${describeScope(chosen.scope)}`);
      const result = runCheck({ check: chosen.check, scope: chosen.scope });
      record.executed.push({
        gate: chosen.check.gate,
        check: chosen.check.name,
        scope: chosen.scope,
        exitCode: result.exitCode,
        seconds: result.seconds,
        outcome: result.exitCode === 0 ? "passed" : "failed",
      });
      if (result.exitCode !== 0) {
        record.failures.push(`${chosen.check.name} exited with ${result.exitCode}`);
        break;
      }
    }
  }

  if (record.failures.length > 0) {
    record.outcome = "red";
    writeRecord(CHANGE_RECORD, record);
    console.log("Failures:");
    for (const failure of record.failures) console.log(`  ${failure}`);
    console.log("Result: red — validation by change stopped at the first failing check.");
    return 1;
  }

  record.outcome = "green";
  writeRecord(CHANGE_RECORD, record);
  console.log(
    `Result: green — validation by change verified ${record.executed.length} check(s) over ${plan.affected.length} affected file(s) against ${base}. Integral verification was not performed; the periodic checks above keep the scope this result does not cover.`,
  );
  return 0;
}

// Integral validation: every Gate over its whole input, including the checks
// the policy assigns to periodic execution.
function integralValidation() {
  const plan = planIntegral(policy);
  const record = {
    mode: MODE.integral,
    policyVersion: policy.version,
    commit: headCommit() ?? null,
    completedAt: new Date().toISOString(),
    estimatedSeconds: plan.estimatedSeconds,
    superseded: plan.superseded,
    results: [],
    failed: [],
  };

  console.log(`Harness: integral validation (policy v${policy.version})`);
  console.log(
    `Checks: ${plan.executed.length} over their whole input; ${plan.superseded.length} reduced-scope check(s) superseded by an integral check`,
  );
  console.log(
    `Estimated: ${plan.estimatedSeconds}s (approved integral cadence; the change budget does not gate it)`,
  );
  console.log("Executed:");
  for (const entry of plan.executed) {
    console.log(`  ${entry.check.name} — scope: whole input`);
    const result = runCheck(entry);
    const outcome = result.exitCode === 0 ? "passed" : "failed";
    const failedFiles =
      outcome === "failed" && entry.check.gate === "Mutation" ? failedFilesOf(entry.check) : null;
    record.results.push({
      gate: entry.check.gate,
      check: entry.check.name,
      cadence: entry.check.cadence,
      scope: "whole",
      outcome,
      exitCode: result.exitCode,
      seconds: result.seconds,
      failedFiles,
    });
    if (outcome === "failed") {
      record.failed.push({
        gate: entry.check.gate,
        check: entry.check.name,
        failedFiles,
      });
    }
  }

  writeRecord(INTEGRAL_RECORD, record);
  if (record.failed.length > 0) {
    console.log("Failures:");
    for (const failure of record.failed) console.log(`  ${failure.check}`);
    console.log(
      "Result: red — integral validation failed. The record reports the failed checks and the scope each one measured, so changes in that scope are not reported green until it is treated.",
    );
    return 1;
  }
  console.log(
    "Result: green — integral validation ran every Gate over its whole input and the periodic checks above were included.",
  );
  return 0;
}

process.exit(mode === MODE.integral ? integralValidation() : changeValidation());
