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
import { MUTATION_SCOPE_ENV, SELECTION, writeScopeRecord } from "./mutation-scope.mjs";

const OVERALL_THRESHOLD = 80;
const CORE_THRESHOLD = 90;
const CORE_PREFIX = "src/lending/";
const MUTABLE = /^src\/(catalog|lending)\/domain\/.*\.ts$/;
const REPORT = "reports/mutation/mutation.json";

const full = process.argv.includes("--full");
const failures = [];

// Returns the command's trimmed stdout, or undefined when it failed. A
// successful command that printed nothing yields the empty string.
function git(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

// A command's non-empty output lines, or undefined when the command failed;
// callers must not read a failure as "nothing here".
function gitLines(args) {
  const output = git(args);
  if (output === undefined) return undefined;
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function baseRefs(base) {
  // CI checks out a commit without a local branch, so the base usually exists
  // only as a remote-tracking ref. `origin` comes first and the other remotes
  // follow in sorted order, so a clone with extra remotes resolves the same
  // base as CI. The bare branch name comes last, for a base that exists only
  // locally.
  const remotes = gitLines(["remote"]);
  if (remotes === undefined) return undefined;
  const rest = remotes.filter((remote) => remote !== "origin").sort();
  const ordered = remotes.includes("origin") ? ["origin", ...rest] : rest;
  return [...new Set([...ordered.map((remote) => `${remote}/${base}`), base])];
}

function resolveBase(base) {
  const refs = baseRefs(base);
  if (refs === undefined) {
    return { reason: `the remotes cannot be listed to resolve "${base}"` };
  }
  for (const ref of refs) {
    const tip = git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    if (tip !== undefined) return { ref, tip };
  }
  return { reason: `base "${base}" is not resolvable here` };
}

// git diff reports paths from the repository root while git ls-files reports
// them from the current directory; normalise both to the current directory.
// Returns undefined when the root cannot be read, so the caller widens instead
// of filtering un-normalised paths away.
function normaliseToWorkingDirectory(paths) {
  const root = git(["rev-parse", "--show-toplevel"]);
  if (root === undefined) return undefined;
  const prefix = relative(root, process.cwd()).split("\\").join("/");
  if (prefix === "" || prefix === ".") return paths;
  return paths.map((path) =>
    path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : path,
  );
}

// A file this Gate may mutate: a domain module, never a test. Both the changed
// set and a declared proof scope use this one rule, so the two cannot disagree
// about what an eligible input is.
function isEligible(path) {
  return MUTABLE.test(path) && !path.endsWith(".test.ts");
}

// Returns the changed files, or why they cannot be read.
function mutableFilesSince(from) {
  const changed = gitLines(["diff", "--name-only", from, "--", "src"]);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard", "--", "src"]);
  if (changed === undefined || untracked === undefined) {
    return { reason: "the changed files cannot be listed" };
  }
  const paths = normaliseToWorkingDirectory([...changed, ...untracked]);
  if (paths === undefined) {
    return { reason: "the project root is not resolvable here" };
  }
  return {
    files: paths.filter(isEligible),
  };
}

// Returns the scope to mutate: the changed files, or why they cannot be
// established. Widening is a scope change, not a failure.
function mutationScope() {
  const base = process.env.MUTATION_BASE ?? "main";
  const resolved = resolveBase(base);
  if (resolved.tip === undefined) {
    return { base, reason: resolved.reason };
  }
  const head = git(["rev-parse", "HEAD"]);
  if (head === undefined) {
    return { base: resolved.ref, reason: "HEAD is not resolvable here" };
  }
  if (resolved.tip === head) {
    // HEAD is the base branch's own tip, so the change to measure is what
    // landed with it: the tip commit against its first parent. Without this the
    // Gate mutates nothing on a push to the base branch.
    const parent = git(["rev-parse", "--verify", "--quiet", `${resolved.tip}^`]);
    if (parent === undefined) {
      return { base: resolved.ref, reason: `${resolved.ref} has no earlier commit here` };
    }
    return { base: resolved.ref, ...mutableFilesSince(parent) };
  }
  const mergeBase = git(["merge-base", resolved.tip, head]);
  if (mergeBase === undefined) {
    return { base: resolved.ref, reason: `"${resolved.ref}" has no common ancestor with HEAD` };
  }
  return { base: resolved.ref, ...mutableFilesSince(mergeBase) };
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

// The Gate checks its own selection before it measures anything, because a
// selection that silently stops matching would pass as a smaller measurement.
// The checks drive this same executable against controlled Git trees; they spawn
// it without this flag, so they cannot recurse into themselves.
if (process.argv.includes("--check-selection")) {
  const checks = run(process.execPath, ["--test", "test/harness/**/*.test.mjs"], {
    timeout: 10 * 60 * 1000,
  });
  if (checks.status !== 0) {
    report("Mutation", ["the scope selection checks failed:", outputOf(checks)]);
  }
  console.log("  scope selection checks passed");
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
  writeScopeRecord({
    selection: SELECTION.rejected,
    requestedFiles: declared.files,
    analyzedFiles: null,
    unavailable: `${MUTATION_SCOPE_ENV} cannot narrow the scheduled --full run`,
  });
  report("Mutation", [`${MUTATION_SCOPE_ENV} cannot narrow the scheduled --full run`]);
}
if (!full) {
  if (declared !== undefined && declared.problems.length > 0) {
    // Nothing runs: a wrong declaration is a setup failure, never evidence that
    // the intended violation was detected, and the record keeps it apart from a
    // scope that analyzed an empty set.
    writeScopeRecord({
      selection: SELECTION.rejected,
      requestedFiles: declared.files,
      analyzedFiles: null,
      unavailable: declared.problems.join("; "),
    });
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
      writeScopeRecord({
        selection: SELECTION.changedSet,
        requestedFiles: null,
        analyzedFiles: [],
        unavailable: null,
      });
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
let analyzedUnavailable = `no readable report at ${REPORT}`;
let reportJson;
if (existsSync(REPORT)) {
  try {
    reportJson = JSON.parse(readFileSync(REPORT, "utf8"));
  } catch {
    failures.push(`mutation report at ${REPORT} is not valid JSON`);
  }
} else if (failures.length === 0) {
  failures.push(`no mutation report at ${REPORT}`);
}

if (reportJson !== undefined) {
  const files = Object.entries(reportJson.files ?? {}).map(([path, file]) => {
    const normalized = relative(process.cwd(), path).split("\\").join("/");
    return { path: normalized, mutants: file.mutants ?? [] };
  });
  analyzedFiles = files.map((file) => file.path);
  analyzedUnavailable = null;

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

writeScopeRecord({ selection, requestedFiles, analyzedFiles, unavailable: analyzedUnavailable });
report("Mutation", failures);
