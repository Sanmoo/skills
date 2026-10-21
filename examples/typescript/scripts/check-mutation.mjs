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

// Returns the command's trimmed stdout, or null when the command failed. A
// successful command that printed nothing yields the empty string.
function git(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : null;
}

function baseRefs(base) {
  // CI checks out a commit without a local branch, so the base usually exists
  // only as a remote-tracking ref. Try the name as given, then every remote.
  const refs = [base];
  for (const remote of (git(["remote"]) ?? "").split("\n").map((line) => line.trim())) {
    if (remote !== "") refs.push(`${remote}/${base}`);
  }
  return [...new Set(refs)];
}

function mergeBaseWith(base) {
  for (const ref of baseRefs(base)) {
    const mergeBase = git(["merge-base", ref, "HEAD"]);
    if (mergeBase) return mergeBase;
  }
  return null;
}

function changedMutableFiles() {
  const base = process.env.MUTATION_BASE ?? "main";
  let mergeBase = mergeBaseWith(base);
  if (mergeBase === null) {
    // No base branch to compare against (for example a shallow clone):
    // mutating everything is the safe reading of "changed", but say so.
    console.log(`  base "${base}" is not resolvable here; mutating the whole codebase`);
    return null;
  }
  if (mergeBase === git(["rev-parse", "HEAD"])) {
    // HEAD is the tip of the base branch, so the change to measure is the tip
    // commit that landed. Without this the Gate mutates nothing.
    const parent = git(["rev-parse", "HEAD^"]);
    if (parent === null) {
      console.log(`  ${base} has no earlier commit here; mutating the whole codebase`);
      return null;
    }
    mergeBase = parent;
  }
  const changed = git(["diff", "--name-only", mergeBase, "--", "src"]) ?? "";
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
  if (changed !== null) {
    if (changed.length === 0) {
      report("Mutation", []);
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

report("Mutation", failures);
