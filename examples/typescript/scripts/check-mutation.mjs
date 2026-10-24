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
// none of this Gate's inputs. So MUTATION_SCOPE lets the proof declare, in
// `scripts/gate-proofs.mjs`, the smallest set of eligible files its violation
// needs; for that execution the declaration replaces the changed set. It is
// setup, not a second violation, and it changes nothing else: the Entry Point,
// Stryker's configuration and the thresholds below stay the ordinary ones. An
// explicitly empty, missing, or ineligible declaration fails here and non-zero
// rather than widening, falling back, or passing with nothing analyzed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { outputOf, report, run } from "./lib.mjs";

const OVERALL_THRESHOLD = 80;
const CORE_THRESHOLD = 90;
const CORE_PREFIX = "src/lending/";
const MUTABLE = /^src\/(catalog|lending)\/domain\/.*\.ts$/;
const REPORT = "reports/mutation/mutation.json";
// Where a run records what it was asked to mutate and what it actually
// mutated. The Gate Proof runner reads it, so this evidence does not depend on
// the Gate's output surviving truncation, and an unavailable scope stays
// distinguishable from an empty one.
const SCOPE_RECORD = "reports/mutation/scope.json";
const SCOPE_ENV = "MUTATION_SCOPE";

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
    files: paths.filter((path) => MUTABLE.test(path) && !path.endsWith(".test.ts")),
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

// Splits a declared scope and checks every part of it. Returns the files, or
// the problems that make the declaration unusable. A declaration is never
// repaired: filtering a bad entry out would mutate a set the proof did not ask
// for, and an empty declaration would analyze nothing at all.
function declaredScope(declaration) {
  const files = declaration
    .split(",")
    .map((file) => file.trim())
    .filter((file) => file !== "");
  if (files.length === 0) {
    return { problems: [`${SCOPE_ENV} names no files, so the proof would analyze nothing`] };
  }
  const problems = [];
  for (const file of files) {
    if (!MUTABLE.test(file) || file.endsWith(".test.ts")) {
      problems.push(`${SCOPE_ENV} names "${file}", which is not an eligible mutation input`);
    } else if (!existsSync(file)) {
      problems.push(`${SCOPE_ENV} names "${file}", which does not exist`);
    }
  }
  return problems.length > 0 ? { problems } : { files };
}

// What a run selected and what it actually analyzed. `analyzedFiles` is null
// when the analysis produced no readable scope, and the reason says so, so a
// reader cannot mistake that for a run that analyzed an empty set.
function recordScope(selection, requestedFiles, analyzedFiles, unavailable) {
  mkdirSync("reports/mutation", { recursive: true });
  writeFileSync(
    SCOPE_RECORD,
    `${JSON.stringify({ selection, requestedFiles, analyzedFiles, unavailable }, null, 2)}\n`,
  );
}

let args = ["run"];
let scope = "the whole codebase";
let selection = "whole-codebase";
let requestedFiles = null;
if (!full) {
  // --full is the scheduled whole-codebase run, never a proof execution, so it
  // keeps its own scope and a declaration cannot narrow it.
  const declaration = process.env[SCOPE_ENV];
  const declared = declaration === undefined ? undefined : declaredScope(declaration);
  if (declared?.problems !== undefined) {
    // Nothing runs: a wrong declaration is a setup failure, and it must not be
    // read later as evidence that the intended violation was detected.
    report("Mutation", declared.problems);
  }
  if (declared !== undefined) {
    requestedFiles = declared.files;
    selection = "explicit";
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
      recordScope("changed-set", null, [], null);
      report("Mutation", []);
      console.log(`  no mutable files changed relative to ${changed.base}`);
      process.exit(0);
    } else {
      selection = "changed-set";
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

let analyzedFiles = null;
let analyzedUnavailable = `the analysis wrote no readable report at ${REPORT}`;
if (failures.length === 0) {
  if (!existsSync(REPORT)) {
    failures.push(`no mutation report at ${REPORT}`);
  } else {
    let reportJson;
    try {
      reportJson = JSON.parse(readFileSync(REPORT, "utf8"));
    } catch {
      failures.push(`mutation report at ${REPORT} is not valid JSON`);
    }
    const files = Object.entries(reportJson?.files ?? {}).map(([path, file]) => {
      const normalized = relative(process.cwd(), path).split("\\").join("/");
      return { path: normalized, mutants: file.mutants ?? [] };
    });
    if (reportJson !== undefined) {
      analyzedFiles = files.map((file) => file.path);
      analyzedUnavailable = null;
    }

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
}

recordScope(selection, requestedFiles, analyzedFiles, analyzedUnavailable);
report("Mutation", failures);
