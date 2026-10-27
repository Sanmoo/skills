// Gate: Mutation.
//
// Proves the tests notice a wrong change. The full Entry Point mutates the
// code changed relative to the base branch; the scheduled CI job passes
// --full and mutates the whole codebase.
//
// Thresholds per GATE-CONTRACTS.md: at least 80% overall and at least 90% in
// the core context (Lending). They live here, in code, and are applied to
// Stryker's JSON report.
//
// A Gate Proof cannot rely on the changed set: the branch it runs on may change
// none of this Gate's inputs. So a proof declares, in `scripts/gate-proofs.mjs`,
// the smallest set of eligible files its violation needs, and for that execution
// the declaration replaces the changed set. It is setup, not a second violation,
// and it changes nothing else: the Entry Point, Stryker's configuration and the
// thresholds below stay the ordinary ones. An explicitly empty, missing, or
// ineligible declaration fails here and non-zero rather than widening, falling
// back, or passing with nothing analyzed.
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { outputOf, report, run } from "./lib.mjs";
import { changedPathsSince, resolveComparison } from "./git-changes.mjs";
import {
  MUTATION_REPORT,
  MUTATION_SCOPE_ENV,
  SELECTION,
  changedSetScope,
  rejectedScope,
  writeScopeRecord,
} from "./mutation-scope.mjs";

const OVERALL_THRESHOLD = 80;
const CORE_THRESHOLD = 90;
const CORE_PREFIX = "src/lending/";
const MUTABLE = /^src\/(catalog|lending)\/domain\/.*\.ts$/;

const full = process.argv.includes("--full");
const failures = [];

// A file this Gate may mutate: a domain module, never a test. Both the changed
// set and a declared proof scope use this one rule, so the two cannot disagree
// about what an eligible input is.
function isEligible(path) {
  return MUTABLE.test(path) && !path.endsWith(".test.ts");
}

// Returns the changed files, or why they cannot be read.
function mutableFilesSince(commit) {
  const changed = changedPathsSince(commit);
  if (changed.paths === undefined) {
    return { reason: changed.reason };
  }
  return { files: changed.paths.filter(isEligible) };
}

// The comparison base the selection policy names, so the Gate and the Entry
// Point's modes cannot measure different changes. A tree without a policy (the
// Gate's own controlled checks) keeps the Contract's default.
function policyBase() {
  try {
    return JSON.parse(readFileSync("harness/policy.json", "utf8")).baseBranch ?? "main";
  } catch {
    return "main";
  }
}

// Returns the scope to mutate: the changed files, or why they cannot be
// established. Widening is a scope change, not a failure.
function mutationScope() {
  const base = process.env.MUTATION_BASE ?? policyBase();
  const resolved = resolveComparison(base);
  if (resolved.commit === undefined) {
    return { base, reason: resolved.reason };
  }
  return { base: resolved.base, ...mutableFilesSince(resolved.commit) };
}

// Splits a declared scope and checks every part of it. A declaration is never
// repaired: filtering a bad entry out would mutate a set the proof did not ask
// for, and an empty declaration would analyze nothing at all. The problems are
// returned with the files so the record can say what was rejected and why.
function declaredScope(declaration) {
  const files = declaration
    .split(",")
    .map((file) => file.trim())
    .filter((file) => file !== "");
  const problems = [];
  if (files.length === 0) {
    problems.push(`${MUTATION_SCOPE_ENV} names no files, so the proof would analyze nothing`);
  }
  for (const file of files) {
    if (!isEligible(file)) {
      problems.push(
        `${MUTATION_SCOPE_ENV} names "${file}", which is not an eligible mutation input`,
      );
    } else if (!existsSync(file)) {
      problems.push(`${MUTATION_SCOPE_ENV} names "${file}", which does not exist`);
    }
  }
  return { files, problems };
}

let args = ["run"];
let scope = "the whole codebase";
let selection = SELECTION.wholeCodebase;
let requestedFiles = null;
const declaration = process.env[MUTATION_SCOPE_ENV];
const declared = declaration === undefined ? undefined : declaredScope(declaration);
// A declaration is a proof execution, so it cannot narrow the scheduled
// whole-codebase run. Rejecting the combination keeps a mis-scoped invocation
// from reporting a whole-codebase result as if it were a proof.
if (full && declared !== undefined) {
  writeScopeRecord(
    rejectedScope(declared.files, `${MUTATION_SCOPE_ENV} cannot narrow the scheduled --full run`),
  );
  report("Mutation", [`${MUTATION_SCOPE_ENV} cannot narrow the scheduled --full run`]);
}
if (!full) {
  if (declared !== undefined && declared.problems.length > 0) {
    // Nothing runs: a wrong declaration is a setup failure, never evidence that
    // the intended violation was detected, and the record keeps it apart from a
    // scope that analyzed an empty set.
    writeScopeRecord(rejectedScope(declared.files, declared.problems.join("; ")));
    report("Mutation", declared.problems);
  }
  if (declared !== undefined) {
    requestedFiles = declared.files;
    selection = SELECTION.explicit;
    args = ["run", "--mutate", declared.files.join(",")];
    scope = `explicit: ${declared.files.join(", ")}`;
  } else {
    const changed = mutationScope();
    if (changed.files === undefined) {
      // A note, not a finding: it never changes the exit code.
      console.log(`  note (Mutation): ${changed.reason}; mutating the whole codebase`);
    } else if (changed.files.length === 0) {
      // A legitimate empty set is not an error; the record keeps it distinct
      // from a scope that could not be measured.
      writeScopeRecord(changedSetScope([]));
      report("Mutation", []);
      console.log(`  no mutable files changed relative to ${changed.base}`);
      process.exit(0);
    } else {
      selection = SELECTION.changedSet;
      args = ["run", "--mutate", changed.files.join(",")];
      scope = `${changed.files.length} changed file(s) vs ${changed.base}`;
    }
  }
}

const mutation = run("stryker", args, { timeout: 30 * 60 * 1000 });
if (mutation.status !== 0) {
  failures.push(`stryker exited with ${mutation.status}:\n${outputOf(mutation)}`);
}

function score(mutants) {
  const valid = mutants.filter(
    (mutant) => mutant.status !== "Ignored" && mutant.status !== "CompileError",
  );
  const detected = valid.filter((mutant) =>
    ["Killed", "Timeout", "RuntimeError"].includes(mutant.status),
  );
  return {
    detected: detected.length,
    valid: valid.length,
    score: valid.length === 0 ? 100 : (detected.length / valid.length) * 100,
  };
}

// What the analysis actually covered, read from its report whatever Stryker's
// exit status was: a run that failed can still have left an analyzable report,
// and calling that "unavailable" would be wrong.
let analyzedFiles = null;
let analyzedFilesUnavailable = `no readable report at ${MUTATION_REPORT}`;
let reportJson;
if (existsSync(MUTATION_REPORT)) {
  try {
    reportJson = JSON.parse(readFileSync(MUTATION_REPORT, "utf8"));
  } catch {
    failures.push(`mutation report at ${MUTATION_REPORT} is not valid JSON`);
  }
} else if (failures.length === 0) {
  failures.push(`no mutation report at ${MUTATION_REPORT}`);
}

if (reportJson !== undefined) {
  const files = Object.entries(reportJson.files ?? {}).map(([path, file]) => {
    const normalized = relative(process.cwd(), path).split("\\").join("/");
    return { path: normalized, mutants: file.mutants ?? [] };
  });
  analyzedFiles = files.map((file) => file.path);
  analyzedFilesUnavailable = null;

  if (files.length === 0) {
    failures.push("Stryker mutated no code");
  } else {
    const all = score(files.flatMap((file) => file.mutants));
    const coreFiles = files.filter((file) => file.path.startsWith(CORE_PREFIX));
    const core = score(coreFiles.flatMap((file) => file.mutants));

    console.log(`Mutation scope: ${scope}`);
    if (requestedFiles !== null) {
      console.log(`  declared for this execution: ${requestedFiles.join(", ")}`);
    }
    for (const file of files) {
      const result = score(file.mutants);
      const label = file.path.startsWith(CORE_PREFIX) ? "core" : "supporting";
      console.log(
        `  ${file.path} (${label}): ${result.detected}/${result.valid} = ${result.score.toFixed(1)}%`,
      );
    }
    console.log(
      `  overall: ${all.detected}/${all.valid} = ${all.score.toFixed(1)}% (minimum ${OVERALL_THRESHOLD}%)`,
    );
    console.log(
      `  core (${CORE_PREFIX}): ${core.detected}/${core.valid} = ${core.score.toFixed(1)}% (minimum ${CORE_THRESHOLD}%)`,
    );

    if (all.score < OVERALL_THRESHOLD) {
      failures.push(
        `overall mutation score ${all.score.toFixed(1)}% is below ${OVERALL_THRESHOLD}%`,
      );
    }
    if (core.valid > 0 && core.score < CORE_THRESHOLD) {
      failures.push(`core mutation score ${core.score.toFixed(1)}% is below ${CORE_THRESHOLD}%`);
    }
  }
}

writeScopeRecord({
  selection,
  requestedFiles,
  analyzedFiles,
  analyzedFilesUnavailable,
  analysisCompleted: reportJson !== undefined && mutation.status === 0,
});
report("Mutation", failures);
