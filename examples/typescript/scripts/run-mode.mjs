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
import { run } from "./lib.mjs";
import { changedPathsSince, headCommit, resolveComparison } from "./git-changes.mjs";
import { MUTATION_SCOPE_RECORD, readScopeRecord } from "./mutation-scope.mjs";
import {
  CHANGE_RECORD,
  INTEGRAL_RECORD,
  MODE,
  checkName,
  loadPolicy,
  planChange,
  planIntegral,
  periodicIndependence,
  widenSelection,
} from "./selection.mjs";

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

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

function writeRecord(path, record) {
  mkdirSync("reports", { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

// Runs one check with the scope the plan gave it. A check that narrows reads
// HARNESS_SCOPE; leaving it unset is what tells the check to verify its whole
// input. Output is inherited so the Gate names itself in the Entry Point, which
// is what a Gate Proof attributes a red result to.
function runCheck(entry) {
  if (entry.check.scopeRecord !== undefined) {
    // An earlier run's scope record must not be read as this run's evidence.
    rmSync(MUTATION_SCOPE_RECORD, { force: true });
  }
  const environment = {
    // A scope exported by the caller must not narrow a check the plan runs
    // whole; an unset value is omitted from the child's environment.
    HARNESS_SCOPE: Array.isArray(entry.scope) ? JSON.stringify(entry.scope) : undefined,
  };
  const started = Date.now();
  const result = run(NPM, ["run", "--silent", entry.check.target], {
    stdio: "inherit",
    env: environment,
  });
  return {
    exitCode: result.status ?? 1,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
}

function describeScope(scope) {
  if (Array.isArray(scope)) return `${scope.length} affected file(s)`;
  return scope === "changed" ? "the check's own changed set" : "whole input";
}

function readIntegralStatus() {
  try {
    return { record: JSON.parse(readFileSync(INTEGRAL_RECORD, "utf8")) };
  } catch {
    return { record: null };
  }
}

// What an integral run recorded about a failed check's analysed files, when the
// check keeps that record. A check without one relies on its impact pattern.
function failedFilesOf(check) {
  if (check.scopeRecord === undefined) return null;
  const { record } = readScopeRecord();
  return record?.analyzedFiles ?? null;
}

// The periodic checks, their last integral result, and whether that result
// reaches this change. The relationship is established, never assumed.
function periodicStatus(plan, comparison) {
  const status = readIntegralStatus();
  const periodic = plan.periodic.map((entry) => {
    const name = checkName(entry.check);
    const result = status.record?.results?.find((candidate) => candidate.check === name);
    const failure = status.record?.failed?.find((candidate) => candidate.check === name);
    const last =
      status.record === null || result === undefined
        ? { state: "not-recorded" }
        : failure === undefined
          ? { state: "passed" }
          : { state: "failed", commit: status.record.commit };
    return { ...entry, last, failure };
  });

  let relationOf;
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
  const failures = periodic
    .filter((entry) => entry.last.state === "failed")
    .map((entry) => {
      const relation = relationOf(entry.failure);
      return {
        gate: entry.check.gate,
        check: checkName(entry.check),
        commit: entry.last.commit,
        relation,
        independent: relation === "independent",
      };
    });
  return { periodic, failures };
}

function printPeriodic(periodic, failures) {
  console.log("Periodic (not run in change validation):");
  if (periodic.length === 0) {
    console.log("  none");
    return;
  }
  for (const entry of periodic) {
    const name = checkName(entry.check);
    const last =
      entry.last.state === "not-recorded"
        ? "last integral result: not recorded"
        : entry.last.state === "passed"
          ? "last integral result: passed"
          : `last integral result: failed (${entry.last.commit.slice(0, 12)})`;
    const failure = failures.find((candidate) => candidate.check === name);
    const relation =
      failure === undefined
        ? ""
        : failure.relation === "independent"
          ? "; independent of this change"
          : failure.relation === "affected"
            ? "; in this change's scope"
            : "; its relationship to this change is uncertain, so the selection was widened";
    console.log(`  ${name} — ${last}${relation}`);
    if (entry.check.cadence !== undefined && entry.check.schedule !== undefined) {
      console.log(`    cadence: ${entry.check.schedule}`);
    }
  }
}

function printNotApplicable(entries) {
  console.log("Not applicable:");
  if (entries.length === 0) {
    console.log("  none");
    return;
  }
  for (const entry of entries) console.log(`  ${entry.check} — ${entry.reason}`);
}

// Runs the selected checks in policy order and stops at the first failure: the
// Entry Point's exit status names the first thing that needs attention, and the
// report keeps that apart from the checks that were not reached.
function runSelected(plan, record) {
  if (plan.executed.length === 0) {
    console.log("Executed: none");
    return;
  }
  console.log("Executed:");
  for (const entry of plan.executed) {
    const name = checkName(entry.check);
    console.log(`  ${name} — scope: ${describeScope(entry.scope)}`);
    const result = runCheck(entry);
    record.executed.push({
      gate: entry.check.gate,
      check: name,
      scope: entry.scope,
      exitCode: result.exitCode,
      seconds: result.seconds,
      outcome: result.exitCode === 0 ? "passed" : "failed",
    });
    if (result.exitCode !== 0) {
      record.failures.push(`${name} exited with ${result.exitCode}`);
      return;
    }
  }
}

// Validation by change.
function changeValidation() {
  const base = process.env.MUTATION_BASE ?? policy.baseBranch;
  const comparison = resolveComparison(base);
  const changed =
    comparison.commit === undefined
      ? { reason: comparison.reason }
      : changedPathsSince(comparison.commit);
  let plan = planChange(policy, changed);
  const { periodic, failures: periodicFailures } = periodicStatus(plan, comparison);

  // A periodic failure whose relationship is uncertain widens the selection
  // instead of being read as independent.
  if (
    periodicFailures.some((failure) => failure.relation === "uncertain") &&
    plan.widened === null
  ) {
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
      check: checkName(entry.check),
      lastResult: entry.last.state,
      commit: entry.last.commit ?? null,
      schedule: entry.check.schedule ?? null,
      protection: entry.check.protection ?? null,
      residualRisk: entry.check.residualRisk ?? null,
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
  printPeriodic(periodic, periodicFailures);
  printNotApplicable(plan.notApplicable);

  const inScope = periodicFailures.filter((failure) => failure.relation === "affected");
  if (inScope.length > 0) {
    for (const failure of inScope) {
      record.failures.push(
        `periodic check "${failure.check}" failed at ${failure.commit} and this change verifies files in its scope`,
      );
    }
    return finish(record, "red", 1, [
      "Failures:",
      ...record.failures.map((failure) => `  ${failure}`),
      "Result: red — a periodic integral failure in this change's scope requires treatment before the change can report green. No check was started.",
    ]);
  }

  if (plan.estimatedSeconds > policy.budgetSeconds) {
    record.inconclusive = {
      reason: `required validation (${plan.executed.length} check(s), ${plan.estimatedSeconds}s) exceeds the approved budget of ${policy.budgetSeconds}s`,
    };
    // The scope the result could not verify stays in the record: a reader must
    // be able to see which checks and scopes were required, not only the total.
    record.required = plan.executed.map((entry) => ({
      gate: entry.check.gate,
      check: checkName(entry.check),
      scope: entry.scope,
    }));
    return finish(record, "inconclusive", 3, [
      "Inconclusive:",
      `  ${record.inconclusive.reason}; no check was started.`,
      `  not verified: ${record.required.map((entry) => entry.check).join(", ")}`,
      "Result: INCONCLUSIVE — the wider validation this change requires was not run; no Gate may be reported green for it.",
    ]);
  }

  runSelected(plan, record);

  if (record.failures.length > 0) {
    return finish(record, "red", 1, [
      "Failures:",
      ...record.failures.map((failure) => `  ${failure}`),
      "Result: red — validation by change stopped at the first failing check.",
    ]);
  }

  if (record.executed.length === 0) {
    // No changed file means no check applied. Saying so is the difference
    // between a scoped result and a silent skip.
    return finish(record, "green", 0, [
      `Result: green — no file changed relative to ${base}, so no check applied and this result verifies nothing. Integral verification was not performed.`,
    ]);
  }
  return finish(record, "green", 0, [
    `Result: green — validation by change verified ${record.executed.length} check(s) over ${plan.affected.length} affected file(s) against ${base}. Integral verification was not performed; the periodic checks above keep the scope this result does not cover.`,
  ]);
}

// One way out of validation by change: the outcome is recorded before it is
// reported, so a reader of the record and a reader of the log see the same
// result even when the output is truncated.
function finish(record, outcome, code, lines) {
  record.outcome = outcome;
  writeRecord(CHANGE_RECORD, record);
  for (const line of lines) console.log(line);
  return code;
}

// Integral validation: every Gate over its whole input, including the checks
// the policy assigns to periodic execution. It does not stop at the first
// failure: the point of the integral record is every Gate's outcome.
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
    const name = checkName(entry.check);
    console.log(`  ${name} — scope: whole input`);
    const result = runCheck({ check: entry.check, scope: "whole" });
    const outcome = result.exitCode === 0 ? "passed" : "failed";
    const failedFiles = outcome === "failed" ? failedFilesOf(entry.check) : null;
    record.results.push({
      gate: entry.check.gate,
      check: name,
      cadence: entry.check.cadence,
      scope: "whole",
      outcome,
      exitCode: result.exitCode,
      seconds: result.seconds,
      failedFiles,
    });
    if (outcome === "failed") {
      record.failed.push({ gate: entry.check.gate, check: name, failedFiles });
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
