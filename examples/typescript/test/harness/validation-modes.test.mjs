// Checks at the full Entry Point's execution-mode boundary.
//
// The Entry Point gains two modes: validation by change, and integral
// validation. What has to hold is observable only through the command: which
// checks run, over which scope, which are reported instead of run, when the
// result is inconclusive instead of run, and whether a periodic failure is
// treated as part of the change's scope. Everything here drives the real
// executable against a controlled Git tree and stand-in checks, so the checks
// observe selection, reporting and exit status rather than any helper's name.
//
// The fixture policy below is a controlled budget fixture: it is small enough
// to read in one screen, and its checks only record what they were asked to
// verify, so a failing exit can be attributed to selection alone.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { baseEnvironment, newSandbox, writeTree } from "../support/harness-sandbox.mjs";

const PROJECT = dirname(dirname(import.meta.dirname));
const RUN_MODE = join(PROJECT, "scripts", "run-mode.mjs");

const POLICY = {
  version: 7,
  baseBranch: "main",
  budgetSeconds: 600,
  sourceTrees: ["src"],
  sharedPaths: ["package.json", "package-lock.json", "harness/**"],
  checks: [
    {
      gate: "Types",
      name: "Types",
      target: "types",
      tier: "fast",
      cadence: "change",
      costSeconds: 10,
      impact: ["src/**/*.ts"],
      scope: "affected-files",
      scopeMatch: ["src/**/*.ts"],
    },
    {
      gate: "Unit tests",
      name: "Unit tests",
      target: "unit",
      tier: "fast",
      cadence: "change",
      costSeconds: 10,
      impact: ["src/**/*.ts"],
      scope: "affected-files",
      scopeMatch: ["src/**/*.test.ts"],
      scopeDescription: "unit test files",
    },
    {
      gate: "E2E tests",
      name: "E2E tests",
      target: "e2e",
      tier: "full",
      cadence: "change",
      costSeconds: 100,
      impact: ["src/**", "features/**"],
      scope: "whole",
    },
    {
      gate: "Mutation",
      name: "Mutation (changed code)",
      target: "mutation",
      tier: "full",
      cadence: "change",
      costSeconds: 50,
      impact: ["src/**/*.ts"],
      scope: "changed",
    },
    {
      gate: "Mutation",
      name: "Mutation (whole codebase)",
      target: "mutation-full",
      tier: "full",
      cadence: "periodic",
      costSeconds: 300,
      impact: ["src/**/*.ts"],
    },
    {
      gate: "Guide pointers",
      name: "Guide pointers",
      target: "pointers",
      tier: "fast",
      cadence: "change",
      costSeconds: 5,
      impact: ["**/*.md"],
      scope: "whole",
    },
  ],
};

const BASE_FILES = {
  "src/upstream.ts": "export const value = 1;\n",
  "src/dependent.ts":
    'import { value } from "./upstream.js";\n\nexport const doubled = value * 2;\n',
  "src/dependent.test.ts": 'import { doubled } from "./dependent.js";\n\nvoid doubled;\n',
  "README.md": "# Fixture\n",
  "package-lock.json": "{}\n",
};

// A stand-in check records the scope it was asked to verify and whether the
// mode that invoked it was the change or the integral one. Its behaviour is
// fixture data, so a red exit says what the selection asked it to look at.
function checkScript(target, behaviour) {
  return `import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const scope =
  process.env.HARNESS_SCOPE === undefined ? null : JSON.parse(process.env.HARNESS_SCOPE);
const upstream = existsSync("src/upstream.ts") ? readFileSync("src/upstream.ts", "utf8") : "";
mkdirSync("reports/ran", { recursive: true });
writeFileSync(
  "reports/ran/${target}.json",
  JSON.stringify({ scope }),
);

const behaviour = ${JSON.stringify(behaviour)};
let fails = behaviour === "fail";
if (behaviour === "fail-when-dependent-is-verified") {
  // The upstream change breaks the dependent: the defect lives in the
  // dependent, so it is visible only when the dependent is verified.
  fails = upstream.includes("BREAK_DEPENDENT") && Array.isArray(scope) && scope.includes("src/dependent.ts");
}
console.log(\`\${fails ? "✘" : "✔"} ${target}\`);
process.exit(fails ? 1 : 0);
`;
}

const BEHAVIOUR = {
  types: "fail-when-dependent-is-verified",
  unit: "pass",
  e2e: "pass",
  mutation: "pass",
  "mutation-full": "pass",
  pointers: "pass",
};

function sandbox(t, { policy = POLICY, files = BASE_FILES, behaviour = BEHAVIOUR } = {}) {
  const { root, git } = newSandbox(t);
  const scripts = Object.fromEntries(
    policy.checks.map((check) => [check.target, `node checks/${check.target}.mjs`]),
  );
  const checks = Object.fromEntries(
    policy.checks.map((check) => [
      `checks/${check.target}.mjs`,
      checkScript(check.target, behaviour[check.target] ?? "pass"),
    ]),
  );
  writeTree(root, {
    ".gitignore": "reports/\n",
    "harness/policy.json": `${JSON.stringify(policy, null, 2)}\n`,
    "package.json": `${JSON.stringify(
      { name: "mode-fixture", private: true, type: "module", scripts },
      null,
      2,
    )}\n`,
    ...files,
    ...checks,
  });
  git("add", "-A");
  git("commit", "-m", "base");
  git("checkout", "-b", "change");

  const run = (mode, { env = {}, changes = {} } = {}) => {
    if (Object.keys(changes).length > 0) {
      writeTree(root, changes);
      git("add", "-A");
      git("commit", "-m", "change");
    }
    const result = spawnSync("node", [RUN_MODE, mode], {
      cwd: root,
      encoding: "utf8",
      env: { ...baseEnvironment([]), ...env },
    });
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
    };
  };

  const ran = (target) =>
    existsSync(join(root, "reports", "ran", `${target}.json`))
      ? JSON.parse(readFileSync(join(root, "reports", "ran", `${target}.json`), "utf8"))
      : undefined;
  const record = (name) =>
    existsSync(join(root, "reports", name))
      ? JSON.parse(readFileSync(join(root, "reports", name), "utf8"))
      : undefined;
  return { root, git, run, ran, record };
}

describe("validation by change", () => {
  it("states the scope of a green result without claiming integral verification", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", { changes: { "src/upstream.ts": "// edited\n" } });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /validation by change/);
    assert.match(result.output, /Affected \(with dependents\): 3 file/);
    assert.match(result.output, /integral verification was not performed/i);
    assert.doesNotMatch(result.output, /whole application was verified/i);
    const selection = fixture.record("change-selection.json");
    assert.equal(selection.mode, "change");
    assert.equal(selection.policyVersion, 7);
    assert.equal(selection.outcome, "green");
    assert.equal(selection.integralVerification, false);
    assert.deepEqual(selection.changed, ["src/upstream.ts"]);
    assert.deepEqual(selection.affected, [
      "src/dependent.test.ts",
      "src/dependent.ts",
      "src/upstream.ts",
    ]);
  });

  it("selects deterministically: equivalent inputs give equivalent selection", (t) => {
    const fixture = sandbox(t);
    const changes = { "src/upstream.ts": "// edited\n" };

    const first = fixture.run("change", { changes });
    const firstSelection = fixture.record("change-selection.json");
    const second = fixture.run("change");
    const secondSelection = fixture.record("change-selection.json");

    assert.equal(first.status, 0, first.output);
    assert.equal(second.status, 0, second.output);
    assert.deepEqual(
      secondSelection.executed.map((entry) => [entry.gate, entry.scope]),
      firstSelection.executed.map((entry) => [entry.gate, entry.scope]),
    );
    assert.deepEqual(secondSelection.affected, firstSelection.affected);
    assert.deepEqual(secondSelection.notApplicable, firstSelection.notApplicable);
  });

  it("verifies affected dependents, so a violation in one is caught rather than listed", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", {
      changes: { "src/upstream.ts": "// BREAK_DEPENDENT\nexport const value = 1;\n" },
    });

    assert.notEqual(result.status, 0, "the dependent's violation must turn the run red");
    assert.match(result.output, /✘ types/);
    const types = fixture.ran("types");
    assert.deepEqual(types.scope, ["src/dependent.test.ts", "src/dependent.ts", "src/upstream.ts"]);
    const selection = fixture.record("change-selection.json");
    assert.equal(selection.outcome, "red");
    // The dependent is unchanged on the branch; it is verified because the
    // selection includes dependents, not because it was edited.
    assert.equal(selection.changed.includes("src/dependent.ts"), false);
  });

  it("widens the selection when shared configuration or dependencies change", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", {
      changes: { "package-lock.json": '{ "lockfileVersion": 3 }\n' },
    });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Widened: .*package-lock\.json/);
    const selection = fixture.record("change-selection.json");
    assert.ok(selection.widened, "the reason for widening is recorded");
    assert.deepEqual(
      selection.executed.map((entry) => entry.check),
      ["Types", "Unit tests", "E2E tests", "Mutation (changed code)", "Guide pointers"],
    );
    // Nothing is narrowed from an unreliable dependency graph: every scoped
    // check was asked to verify its whole input. The Mutation Gate keeps its own
    // changed-set selection, which the wider selection does not replace.
    for (const entry of selection.executed) {
      const expected = entry.check === "Mutation (changed code)" ? "changed" : "whole";
      assert.equal(entry.scope, expected, `${entry.check} kept a narrowed scope`);
    }
  });

  it("returns inconclusive and starts nothing when wider validation exceeds the budget", (t) => {
    const fixture = sandbox(t, { policy: { ...POLICY, budgetSeconds: 60 } });

    const result = fixture.run("change", {
      changes: { "package-lock.json": '{ "lockfileVersion": 3 }\n' },
    });

    assert.equal(result.status, 3, "an inconclusive result is non-zero");
    assert.match(result.output, /INCONCLUSIVE/);
    assert.match(result.output, /approved budget of 60s/);
    assert.match(result.output, /no check was started/i);
    assert.equal(fixture.ran("types"), undefined, "no expensive check may start unapproved");
    assert.equal(fixture.ran("mutation"), undefined);
    assert.equal(fixture.record("change-selection.json").outcome, "inconclusive");
  });

  it("treats an impact it cannot establish as uncertain and widens", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", {
      env: { MUTATION_BASE: "trunk" },
      changes: { "src/upstream.ts": "// edited\n" },
    });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Widened: .*trunk/);
    const selection = fixture.record("change-selection.json");
    assert.match(selection.widened, /trunk/);
    assert.equal(
      selection.executed.length,
      POLICY.checks.filter((c) => c.cadence === "change").length,
    );
  });

  it("is inconclusive, not a silent skip, when uncertain impact widens past the budget", (t) => {
    const fixture = sandbox(t, { policy: { ...POLICY, budgetSeconds: 60 } });

    const result = fixture.run("change", {
      env: { MUTATION_BASE: "trunk" },
      changes: { "src/upstream.ts": "// edited\n" },
    });

    assert.equal(result.status, 3, "an unverifiable change is not a green one");
    assert.match(result.output, /INCONCLUSIVE/);
    assert.match(result.output, /Widened: .*trunk/);
    assert.match(result.output, /no check was started/i);
    for (const target of ["types", "unit", "e2e", "mutation", "pointers"]) {
      assert.equal(fixture.ran(target), undefined, `${target} started without approval`);
    }
  });

  it("widens when a changed file has no established impact", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", { changes: { ".prettierignore": "dist/\n" } });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Widened: .*match no check's impact/);
    const selection = fixture.record("change-selection.json");
    assert.ok(selection.widened);
    assert.ok(selection.executed.length > 0, "an unknown reach widens instead of skipping");
  });

  it("does not hand a deleted file to a file-scoped check", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", { changes: { "src/upstream.ts": null } });

    assert.equal(result.status, 0, result.output);
    const types = fixture.ran("types");
    assert.ok(types.scope.length > 0, "the dependents that still exist are still verified");
    assert.equal(
      types.scope.includes("src/upstream.ts"),
      false,
      "a deleted file has nothing to verify",
    );
  });

  it("reports a check with no affected input as not applicable instead of running it", (t) => {
    const fixture = sandbox(t);

    const result = fixture.run("change", { changes: { "README.md": "# Edited\n" } });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Not applicable:/);
    assert.match(result.output, /Unit tests — no affected unit test files/);
    assert.equal(fixture.ran("unit"), undefined);
  });
});

describe("periodic execution and integral validation", () => {
  it("omits a periodic check from change validation while reporting it, and runs it integrally", (t) => {
    const fixture = sandbox(t);

    const change = fixture.run("change", { changes: { "src/upstream.ts": "// edited\n" } });

    assert.equal(change.status, 0, change.output);
    assert.match(change.output, /Periodic \(not run in change validation\):/);
    assert.match(change.output, /Mutation \(whole codebase\)/);
    assert.equal(fixture.ran("mutation-full"), undefined);

    const integral = fixture.run("integral");

    assert.equal(integral.status, 0, integral.output);
    assert.match(integral.output, /integral validation/);
    assert.deepEqual(fixture.ran("mutation-full").scope, null, "integral runs the whole input");
    const status = fixture.record("integral-status.json");
    assert.equal(status.mode, "integral");
    assert.equal(status.policyVersion, 7);
    assert.ok(status.results.some((entry) => entry.check === "Mutation (whole codebase)"));
    assert.deepEqual(status.failed, []);
  });

  it("keeps a periodic integral failure visible and treats its scope as affected", (t) => {
    const fixture = sandbox(t, {
      behaviour: { ...BEHAVIOUR, "mutation-full": "fail" },
    });
    const integral = fixture.run("integral");
    assert.notEqual(integral.status, 0, "integral validation reports the failure");
    const status = fixture.record("integral-status.json");
    assert.deepEqual(
      status.failed.map((entry) => entry.check),
      ["Mutation (whole codebase)"],
    );

    const inScope = fixture.run("change", { changes: { "src/upstream.ts": "// edited\n" } });

    assert.notEqual(inScope.status, 0, "a change in the failed scope must not report green");
    assert.match(inScope.output, /Periodic \(not run in change validation\):/);
    assert.match(inScope.output, /failed/);
    assert.match(inScope.output, /requires treatment/i);
    const selection = fixture.record("change-selection.json");
    assert.equal(selection.outcome, "red");
    assert.equal(selection.periodicFailures.length, 1);
    assert.equal(selection.periodicFailures[0].independent, false);
  });

  it("widens instead of assuming independence when a failure's relationship is uncertain", (t) => {
    const uncertain = {
      ...POLICY,
      checks: [
        ...POLICY.checks,
        {
          gate: "Manual review",
          target: "manual",
          tier: "full",
          cadence: "periodic",
          costSeconds: 10,
          impact: [],
        },
      ],
    };
    const fixture = sandbox(t, {
      policy: uncertain,
      behaviour: { ...BEHAVIOUR, manual: "fail" },
    });
    fixture.run("integral");

    const result = fixture.run("change", { changes: { "src/upstream.ts": "// edited\n" } });

    assert.equal(result.status, 0, result.output);
    assert.equal(result.status === 0 && /Widened: .*uncertain/.test(result.output), true);
    assert.match(result.output, /relationship to this change is uncertain/);
    const selection = fixture.record("change-selection.json");
    assert.equal(selection.periodicFailures[0].relation, "uncertain");
    assert.equal(selection.widened.includes("uncertain"), true);
  });

  it("lets a demonstrably independent change proceed despite a periodic failure", (t) => {
    const fixture = sandbox(t, {
      behaviour: { ...BEHAVIOUR, "mutation-full": "fail" },
    });
    fixture.run("integral");

    const result = fixture.run("change", { changes: { "README.md": "# Edited\n" } });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Periodic \(not run in change validation\):/);
    assert.match(result.output, /independent/);
    const selection = fixture.record("change-selection.json");
    assert.equal(selection.outcome, "green");
    assert.equal(selection.periodicFailures[0].independent, true);
  });
});
