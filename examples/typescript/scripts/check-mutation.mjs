// Gate: Mutation.
//
// Proves the tests notice a wrong change. The full Entry Point mutates the
// code changed relative to the base branch; the scheduled CI job passes
// --full and mutates the whole codebase.
//
// Thresholds per GATE-CONTRACTS.md: at least 80% overall and at least 90% in
// the core context (Lending). They live here, in code, and are applied to
// Stryker's JSON report.
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { outputOf, report, run } from "./lib.mjs";

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
  // follow in byte order, so a clone with extra remotes resolves the same base
  // as CI; the bare branch name is the last resort for a repository with no
  // remote at all.
  const remotes = gitLines(["remote"]);
  if (remotes === undefined) return undefined;
  remotes.sort((a, b) => {
    if (a === b) return 0;
    if (a === "origin") return -1;
    if (b === "origin") return 1;
    return a < b ? -1 : 1;
  });
  return [...new Set([...remotes.map((remote) => `${remote}/${base}`), base])];
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

// Returns the changed files, or why they cannot be read. A failed listing is a
// reason to widen, never an empty changed set.
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
// established. Neither outcome is a failure, because widening is a scope change
// and a day-zero repository has no base branch to resolve at all.
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

let args = ["run"];
let scope = "the whole codebase";
if (!full) {
  const changed = mutationScope();
  if (changed.files === undefined) {
    // A note, not a finding: it never changes the exit code.
    console.log(`  note (Mutation): ${changed.reason}; mutating the whole codebase`);
  } else if (changed.files.length === 0) {
    report("Mutation", []);
    console.log(`  no mutable files changed relative to ${changed.base}`);
    process.exit(0);
  } else {
    args = ["run", "--mutate", changed.files.join(",")];
    scope = `${changed.files.length} changed file(s) vs ${changed.base}`;
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

    if (files.length === 0) {
      failures.push("Stryker mutated no code");
    } else {
      const all = score(files.flatMap((file) => file.mutants));
      const coreFiles = files.filter((file) => file.path.startsWith(CORE_PREFIX));
      const core = score(coreFiles.flatMap((file) => file.mutants));

      console.log(`Mutation scope: ${scope}`);
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

report("Mutation", failures);
