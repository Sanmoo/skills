// Rehearsal of the full Entry Point's two modes on a disposable copy.
//
// This is not part of either Entry Point and not evidence about this tree: it
// copies the project to a throwaway directory, replaces the versioned policy
// with a controlled budget fixture, and drives `make check` and
// `make check MODE=integral` there. The fixture's checks are small stand-ins
// that record the scope they were asked to verify, so every outcome below is
// attributable to selection and reporting; the fixture says nothing about how
// long the real Gates take on an immense application.
//
// It demonstrates what the mode design claims: the two modes run; a violation
// in an affected dependent is caught, not merely listed; a shared dependency
// change widens the selection; wider validation beyond the approved budget is
// inconclusive and starts nothing; a periodic check is omitted from change
// validation while being reported; and a periodic integral failure stays
// visible, blocks work in its scope, and leaves an independent change able to
// proceed. Run it with `npm run rehearse-validation`; the transcript it prints
// is also written under reports/, which Git ignores.
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const PROJECT = dirname(import.meta.dirname);
const TRANSCRIPT = join(PROJECT, "reports", "validation-rehearsal.txt");
const MAKE = process.platform === "win32" ? "make.exe" : "make";
const SKIP = /(^|\/)(\.git|node_modules|dist|reports|coverage|\.stryker-tmp)(\/|$)/;

const POLICY = {
  version: 3,
  baseBranch: "main",
  budgetSeconds: 600,
  sourceTrees: ["src"],
  sharedPaths: ["package.json", "package-lock.json", "harness/**"],
  checks: [
    {
      gate: "Types",
      name: "Types",
      target: "probe-types",
      tier: "fast",
      cadence: "change",
      costSeconds: 10,
      impact: ["src/**/*.ts"],
      scope: "affected-files",
      scopeMatch: ["src/**/*.ts"],
      scopeDescription: "type-checkable files",
    },
    {
      gate: "Unit tests",
      name: "Unit tests",
      target: "probe-unit",
      tier: "fast",
      cadence: "change",
      costSeconds: 10,
      impact: ["src/**/*.ts"],
      scope: "affected-files",
      scopeMatch: ["src/**/*.test.ts"],
      scopeDescription: "unit test files",
    },
    {
      gate: "Mutation",
      name: "Mutation (changed code)",
      target: "probe-mutation",
      tier: "full",
      cadence: "change",
      costSeconds: 50,
      impact: ["src/**/*.ts"],
      scope: "changed",
      widenTarget: "probe-mutation-full",
    },
    {
      gate: "Mutation",
      name: "Mutation (whole codebase)",
      target: "probe-mutation-full",
      tier: "full",
      cadence: "periodic",
      costSeconds: 300,
      impact: ["src/**/*.ts"],
    },
    {
      gate: "Guide pointers",
      name: "Guide pointers",
      target: "probe-guides",
      tier: "fast",
      cadence: "change",
      costSeconds: 5,
      impact: ["**/*.md"],
      scope: "whole",
    },
  ],
};

// The fixture state. A probe fails only when the state says so, and the states
// below are what each scenario is about.
const STATE = { failTypes: false, failMutationFull: false };

const UPSTREAM = "src/catalog/domain/book.ts";
const DEPENDENT = "src/catalog/application/catalog-service.ts";
const BREAK = "// BREAK_DEPENDENT\n";

const results = [];
const transcript = [];

function record(label, detail = "") {
  transcript.push(`${label}${detail === "" ? "" : `\n${detail}`}`);
  console.log(`${label}${detail === "" ? "" : `\n${detail}`}`);
}

function check(label, condition, detail = "") {
  results.push({ label, ok: Boolean(condition) });
  transcript.push(`${condition ? "✔" : "✘"} ${label}${detail === "" ? "" : `\n${detail}`}`);
  console.log(`${condition ? "✔" : "✘"} ${label}${detail === "" ? "" : `\n${detail}`}`);
}

function copyProject(root) {
  cpSync(PROJECT, root, {
    recursive: true,
    filter: (source) => !SKIP.test(source.slice(PROJECT.length) || "/"),
  });
}

function writeFixture(root) {
  writeFileSync(join(root, "harness", "policy.json"), `${JSON.stringify(POLICY, null, 2)}\n`);
  const scripts = Object.fromEntries(
    POLICY.checks.map((entry) => [entry.target, `node probes/${entry.target}.mjs`]),
  );
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({ name: "validation-rehearsal", private: true, type: "module", scripts }, null, 2)}\n`,
  );
  mkdirSync(join(root, "probes"), { recursive: true });
  for (const entry of POLICY.checks) {
    writeFileSync(
      join(root, "probes", `${entry.target}.mjs`),
      `import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const scope =
  process.env.HARNESS_SCOPE === undefined ? null : JSON.parse(process.env.HARNESS_SCOPE);
const state = JSON.parse(readFileSync("probes/state.json", "utf8"));
const upstream = readFileSync(${JSON.stringify(UPSTREAM)}, "utf8");
const failed =
  (${JSON.stringify(entry.target)} === "probe-types" &&
    state.failTypes &&
    Array.isArray(scope) &&
    scope.includes(${JSON.stringify(DEPENDENT)}) &&
    upstream.includes(${JSON.stringify(BREAK.trim())})) ||
  (${JSON.stringify(entry.target)} === "probe-mutation-full" && state.failMutationFull);
mkdirSync("reports/rehearsal-runs", { recursive: true });
writeFileSync(
  "reports/rehearsal-runs/${entry.target}.json",
  JSON.stringify({ scope, mode: process.env.HARNESS_MODE, failed }),
);
console.log(\`\${failed ? "✘" : "✔"} ${entry.target}\`);
process.exit(failed ? 1 : 0);
`,
    );
  }
  writeState(root, STATE);
}

function writeState(root, state) {
  writeFileSync(join(root, "probes", "state.json"), `${JSON.stringify(state, null, 2)}\n`);
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

function commit(root, message) {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", message]);
}

function branch(root, name) {
  git(root, ["checkout", "--quiet", "--force", "main"]);
  git(root, ["clean", "-fdq", "src", "README.md", "package-lock.json"]);
  git(root, ["checkout", "-q", "-B", name, "main"]);
}

function edit(root, path, content) {
  writeFileSync(join(root, path), content);
  commit(root, `rehearsal change to ${path}`);
}

function entryPoint(root, mode = "change") {
  const environment = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };
  delete environment.HARNESS_SCOPE;
  delete environment.HARNESS_MODE;
  delete environment.HARNESS_BASE;
  delete environment.MUTATION_SCOPE;
  delete environment.MUTATION_BASE;
  const args = mode === "integral" ? ["check", "MODE=integral"] : ["check"];
  const result = spawnSync(MAKE, args, { cwd: root, encoding: "utf8", env: environment });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function ran(root, target) {
  const path = join(root, "reports", "rehearsal-runs", `${target}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

function resetRuns(root) {
  rmSync(join(root, "reports", "rehearsal-runs"), { recursive: true, force: true });
}

function recordOf(root, name) {
  const path = join(root, "reports", name);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

const root = mkdtempSync(join(tmpdir(), "validation-rehearsal-"));
try {
  copyProject(root);
  // The copied Entry Point imports the pinned tools the project installed; the
  // disposable copy shares them instead of paying for a second install.
  if (existsSync(join(PROJECT, "node_modules"))) {
    symlinkSync(join(PROJECT, "node_modules"), join(root, "node_modules"), "dir");
  }
  writeFixture(root);
  writeFileSync(join(root, ".gitignore"), "reports/\nnode_modules/\ndist/\n");
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.email", "harness@example.invalid"]);
  git(root, ["config", "user.name", "Harness"]);
  commit(root, "controlled fixture for the validation rehearsal");

  record("Scenario 1 — a violation in an affected dependent is caught");
  branch(root, "dependent-catch");
  writeState(root, { ...STATE, failTypes: true });
  commit(root, "turn on the dependent's violation");
  edit(root, UPSTREAM, `${BREAK}${readFileSync(join(root, UPSTREAM), "utf8")}`);
  resetRuns(root);
  const dependentCatch = entryPoint(root);
  const typesRun = ran(root, "probe-types");
  check(
    "the dependent is listed in the affected scope and actually verified",
    dependentCatch.status !== 0 &&
      typesRun !== undefined &&
      typesRun.scope.includes(DEPENDENT) &&
      typesRun.scope.includes(UPSTREAM),
    `exit ${dependentCatch.status}; Types scope: ${typesRun?.scope?.join(", ") ?? "did not run"}`,
  );
  check(
    "the change survived no claim of integral verification",
    /validation by change/.test(dependentCatch.output) &&
      !/whole application was verified/i.test(dependentCatch.output),
  );

  record("Scenario 2 — a green change result states its scope and reports the periodic check");
  branch(root, "scoped-green");
  edit(root, "README.md", `${readFileSync(join(root, "README.md"), "utf8")}\nrehearsal\n`);
  resetRuns(root);
  const scoped = entryPoint(root);
  check(
    "green validation by change runs only the checks its scope needs",
    scoped.status === 0 && ran(root, "probe-guides") !== undefined,
    `exit ${scoped.status}`,
  );
  check(
    "the periodic check is omitted and reported, and the result does not claim integral verification",
    ran(root, "probe-mutation-full") === undefined &&
      /Periodic \(not run in change validation\):/.test(scoped.output) &&
      /Mutation \(whole codebase\)/.test(scoped.output) &&
      /Integral verification was not performed/.test(scoped.output),
    scoped.output.split("\n").slice(-4).join("\n"),
  );

  record("Scenario 3 — integral validation actually runs the periodic check");
  resetRuns(root);
  const integral = entryPoint(root, "integral");
  check(
    "integral validation runs the whole-input periodic check",
    integral.status === 0 && ran(root, "probe-mutation-full")?.mode === "integral",
    `exit ${integral.status}`,
  );
  check(
    "integral validation writes the result change validation reads",
    recordOf(root, "integral-status.json")?.failed?.length === 0,
  );

  record("Scenario 4 — wider validation beyond the approved budget is inconclusive");
  branch(root, "budget-exceeded");
  const policyPath = join(root, "harness", "policy.json");
  writeFileSync(policyPath, `${JSON.stringify({ ...POLICY, budgetSeconds: 60 }, null, 2)}\n`);
  commit(root, "approve a budget too small for the widened selection");
  edit(root, "package-lock.json", '{ "lockfileVersion": 3 }\n');
  resetRuns(root);
  const exceeded = entryPoint(root);
  check(
    "a shared dependency change widens the selection and an over-budget result is inconclusive and non-zero",
    exceeded.status !== 0 &&
      /INCONCLUSIVE/.test(exceeded.output) &&
      /approved budget of 60s/.test(exceeded.output),
    `exit ${exceeded.status}`,
  );
  check(
    "no expensive check started for the inconclusive result",
    ["probe-types", "probe-unit", "probe-mutation", "probe-guides"].every(
      (target) => ran(root, target) === undefined,
    ),
    exceeded.output.split("\n").slice(-3).join("\n"),
  );

  record("Scenario 5 — a periodic integral failure stays visible and is scoped");
  branch(root, "periodic-failure");
  writeState(root, { ...STATE, failMutationFull: true });
  commit(root, "make the periodic check fail");
  resetRuns(root);
  const integralFailure = entryPoint(root, "integral");
  check(
    "integral validation reports the periodic failure and records its scope",
    integralFailure.status !== 0 &&
      recordOf(root, "integral-status.json")?.failed?.[0]?.check === "Mutation (whole codebase)",
    `exit ${integralFailure.status}`,
  );
  branch(root, "periodic-failure-change");
  writeState(root, { ...STATE, failMutationFull: true });
  commit(root, "keep the periodic check failing");
  edit(root, UPSTREAM, `${readFileSync(join(root, UPSTREAM), "utf8")}\n// rehearsal change\n`);
  resetRuns(root);
  const inScope = entryPoint(root);
  check(
    "a change in the failed scope is not reported green and requires treatment",
    inScope.status !== 0 && /requires treatment/i.test(inScope.output),
    `exit ${inScope.status}`,
  );
  branch(root, "periodic-failure-independent");
  writeState(root, { ...STATE, failMutationFull: true });
  commit(root, "keep the periodic check failing");
  edit(
    root,
    "README.md",
    `${readFileSync(join(root, "README.md"), "utf8")}\nrehearsal independent\n`,
  );
  resetRuns(root);
  const independent = entryPoint(root);
  check(
    "a demonstrably independent change proceeds while the failure stays visible",
    independent.status === 0 && /independent of this change/.test(independent.output),
    `exit ${independent.status}`,
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

mkdirSync(join(PROJECT, "reports"), { recursive: true });
writeFileSync(TRANSCRIPT, `${transcript.join("\n")}\n`);
console.log(`Rehearsal transcript: ${TRANSCRIPT}`);
const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`${failed.length} rehearsal expectation(s) failed`);
  process.exit(1);
}
console.log("Rehearsal: every expectation held.");
