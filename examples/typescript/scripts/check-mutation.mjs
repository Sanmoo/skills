// Mutation Gate. Mutates the files mutation-scope.mjs selects with the pinned
// Stryker, then applies the overall and core thresholds in harness/mutation.json
// to Stryker's JSON report. It records the requested and analyzed files in
// reports/mutation/scope.json, so a Gate Proof can disclose both.
//   node scripts/check-mutation.mjs           validation by change
//   node scripts/check-mutation.mjs --whole   the whole codebase (integral)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { git, listFiles } from "./lib.mjs";
import { baseBranch } from "./changes.mjs";
import { InvalidScope, changedSet, declaredScope, isEligible } from "./mutation-scope.mjs";

const REPORT = "reports/mutation/mutation.json";
const SCOPE_RECORD = "reports/mutation/scope.json";
const policy = JSON.parse(readFileSync("harness/mutation.json", "utf8"));
const { contexts } = createRequire(import.meta.url)("../.dependency-cruiser.contexts.cjs");
const coreDirs = Object.entries(contexts)
  .filter(([, context]) => context.core)
  .map(([name]) => `src/${name}/`);

const COUNTED = new Set(["Killed", "Timeout", "Survived", "NoCoverage"]);
const DETECTED = new Set(["Killed", "Timeout"]);

function wholeCodebase() {
  return listFiles(["src"], /\.ts$/).filter((file) => isEligible(file, policy));
}

function selectScope() {
  const declared = declaredScope(process.env.MUTATION_SCOPE, policy);
  // A declared scope belongs to one Gate Proof execution; it never narrows
  // integral validation.
  if (declared && process.argv.includes("--whole"))
    throw new InvalidScope("a declared mutation scope cannot narrow the whole-codebase run");
  if (declared) return { source: "declared", requested: declared, files: declared };
  if (process.argv.includes("--whole"))
    return { source: "whole", requested: null, files: wholeCodebase() };
  const base = baseBranch(JSON.parse(readFileSync("harness/policy.json", "utf8")).base);
  const changed = changedSet(base, policy, git);
  if (changed.widened) {
    console.log(
      `Mutation: ${changed.widened}; the changed set cannot be established, so the whole codebase is mutated.`,
    );
    return { source: "widened", reason: changed.widened, requested: null, files: wholeCodebase() };
  }
  return {
    source: "changed",
    base: changed.base,
    compare: changed.compare,
    requested: null,
    files: changed.files,
  };
}

function score(mutants) {
  const counted = mutants.filter((m) => COUNTED.has(m.status));
  if (counted.length === 0) return undefined;
  return (100 * counted.filter((m) => DETECTED.has(m.status)).length) / counted.length;
}

function record(scope, analyzed) {
  mkdirSync("reports/mutation", { recursive: true });
  writeFileSync(
    SCOPE_RECORD,
    `${JSON.stringify({ ...scope, files: undefined, analyzed }, null, 2)}\n`,
  );
}

let scope;
try {
  scope = selectScope();
} catch (error) {
  if (!(error instanceof InvalidScope)) throw error;
  record({ source: "declared", requested: process.env.MUTATION_SCOPE ?? null }, "unavailable");
  console.error(
    `✘ Mutation: ${error.message}; the proof's scope is invalid, so nothing was mutated.`,
  );
  process.exit(2);
}

if (scope.files.length === 0) {
  record(scope, []);
  console.log("✔ Mutation: no production file changed relative to the base; nothing to mutate.");
  process.exit(0);
}

rmSync(REPORT, { force: true });
console.log(`Mutation: mutating ${String(scope.files.length)} file(s) (${scope.source}).`);
const run = spawnSync(
  process.execPath,
  ["node_modules/@stryker-mutator/core/bin/stryker.js", "run", "--mutate", scope.files.join(",")],
  {
    stdio: "inherit",
  },
);
if (run.status !== 0 || !existsSync(REPORT)) {
  record(scope, "unavailable");
  console.error(
    `✘ Mutation: Stryker exited with status ${String(run.status)} without a usable report.`,
  );
  process.exit(1);
}

const files = JSON.parse(readFileSync(REPORT, "utf8")).files;
const analyzed = Object.keys(files).sort();
record(scope, analyzed);
const all = analyzed.flatMap((file) => files[file].mutants);
const core = analyzed
  .filter((file) => coreDirs.some((dir) => file.startsWith(dir)))
  .flatMap((file) => files[file].mutants);
const overall = score(all);
const coreScore = score(core);
const failures = [];
if (scope.source === "declared" && overall === undefined)
  failures.push("the declared scope produced no mutants, so it is ineligible");
if (overall !== undefined && overall < policy.overall)
  failures.push(`overall score ${overall.toFixed(2)}% is below ${String(policy.overall)}%`);
if (coreScore !== undefined && coreScore < policy.core)
  failures.push(`core score ${coreScore.toFixed(2)}% is below ${String(policy.core)}%`);
for (const file of analyzed) {
  for (const m of files[file].mutants.filter(
    (m) => m.status === "Survived" || m.status === "NoCoverage",
  )) {
    console.log(
      `  undetected ${m.status} ${file}:${String(m.location.start.line)} ${m.mutatorName}`,
    );
  }
}
const summary = `overall ${overall?.toFixed(2) ?? "n/a"}%, core ${coreScore?.toFixed(2) ?? "n/a"}% over ${analyzed.join(", ")}`;
if (failures.length > 0) {
  console.error(`✘ Mutation: ${failures.join("; ")} (${summary})`);
  process.exit(1);
}
console.log(`✔ Mutation: ${summary}`);
