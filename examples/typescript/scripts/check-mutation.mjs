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

// Notes are facts the Gate had to report, not findings; `report` prints them
// before the verdict so they land in the Gate's recorded output.
const notes = [];

// Returns the command's trimmed stdout, or undefined when it failed. A
// successful command that printed nothing yields the empty string.
function git(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function baseRefs(base) {
  // CI checks out a commit without a local branch, so the base usually exists
  // only as a remote-tracking ref. Remote-tracking refs come first: a stale
  // local branch must not narrow the changed set, and CI and a developer's
  // clone must resolve the same base.
  const refs = [];
  for (const remote of (git(["remote"]) ?? "").split("\n")) {
    const name = remote.trim();
    if (name !== "") refs.push(`${name}/${base}`);
  }
  refs.push(base);
  return [...new Set(refs)];
}

function resolveBase(base) {
  for (const ref of baseRefs(base)) {
    const tip = git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    if (tip) return { ref, tip };
  }
  return undefined;
}

// Widening the scope cannot hide a worse mutation score, so it is reported and
// the Gate continues rather than failing: a day-zero repository has no base
// branch to resolve at all.
function widenScope(reason) {
  notes.push(reason);
  return undefined;
}

function changedMutableFiles() {
  const base = process.env.MUTATION_BASE ?? "main";
  const resolved = resolveBase(base);
  if (resolved === undefined) {
    return widenScope(`base "${base}" is not resolvable here; mutating the whole codebase`);
  }
  const head = git(["rev-parse", "HEAD"]);
  const mergeBase = head === undefined ? undefined : git(["merge-base", resolved.tip, head]);
  if (head === undefined || mergeBase === undefined) {
    return widenScope(`"${resolved.ref}" and HEAD share no history; mutating the whole codebase`);
  }
  let from = mergeBase;
  if (resolved.tip === head) {
    // HEAD is the base branch's own tip, so the change to measure is what
    // landed with it: the tip commit against its first parent. Without this
    // the Gate mutates nothing on a push to the base branch.
    const parent = git(["rev-parse", "--verify", "--quiet", `${resolved.tip}^`]);
    if (parent === undefined) {
      return widenScope(`${resolved.ref} has no earlier commit here; mutating the whole codebase`);
    }
    from = parent;
  }
  const changed = git(["diff", "--name-only", from, "--", "src"]) ?? "";
  const untracked = git(["ls-files", "--others", "--exclude-standard", "--", "src"]) ?? "";
  // git diff reports paths from the repository root while git ls-files reports
  // them from the current directory; normalise both to the current directory.
  const root = git(["rev-parse", "--show-toplevel"]);
  const prefix = root === null ? "" : relative(root, process.cwd()).split("\\").join("/");
  const normalise = (path) => {
    if (prefix === "" || prefix === ".") return path;
    return path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : path;
  };
  return `${changed}\n${untracked}`
    .split("\n")
    .map((line) => normalise(line.trim()))
    .filter((path) => path !== "" && MUTABLE.test(path) && !path.endsWith(".test.ts"));
}

let args = ["run"];
let scope = "the whole codebase";
if (!full) {
  const changed = changedMutableFiles();
  if (changed !== undefined) {
    if (changed.length === 0) {
      report("Mutation", [], notes);
      console.log("  no mutable files changed relative to the base branch");
      process.exit(0);
    }
    args = ["run", "--mutate", changed.join(",")];
    scope = `${changed.length} changed file(s)`;
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

report("Mutation", failures, notes);
