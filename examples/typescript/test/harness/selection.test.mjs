// The selection policy's rules, on a fixture policy and graph.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { KNOWN_CHECKS } from "../../scripts/gates.mjs";
import { cost, dependents, globToRegExp, plan, wideningReason } from "../../scripts/selection.mjs";

const check = (id, extra = {}) => ({
  id,
  gate: id,
  tier: "fast",
  appliesTo: ["src/**/*.ts"],
  scope: "affected",
  cadence: "change",
  costSeconds: 10,
  ...extra,
});

const policy = {
  version: 1,
  budgetSeconds: 100,
  dependencyRoots: ["src", "test"],
  sharedConfiguration: ["package.json", "harness/**"],
  checks: [
    check("lint"),
    check("types", { scope: "whole" }),
    check("docs", { appliesTo: ["**/*.md"], scope: "whole" }),
    check("mutation", { scope: "changed", integral: "covered by mutation-whole" }),
    check("mutation-whole", { scope: "whole", cadence: "periodic" }),
  ],
};

const graph = new Map([
  ["src/catalog/index.ts", ["src/catalog/book.ts"]],
  ["src/catalog/book.ts", []],
  ["src/lending/service.ts", ["src/catalog/index.ts"]],
  ["src/http/routes.ts", ["src/lending/service.ts"]],
  ["src/lending/other.ts", []],
]);

const change = (...files) => ({ files, deleted: [] });
const entry = (result, id) => result.entries.find((e) => e.check.id === id);

describe("globs", () => {
  it("match across directories and within one", () => {
    assert.ok(globToRegExp("src/**/*.ts").test("src/a/b/c.ts"));
    assert.ok(globToRegExp("src/**/*.ts").test("src/c.ts"));
    assert.ok(!globToRegExp("*.md").test("docs/a.md"));
    assert.ok(globToRegExp("**").test("a/b"));
    assert.ok(globToRegExp(".dependency-cruiser.*.cjs").test(".dependency-cruiser.base.cjs"));
  });
});

describe("dependents", () => {
  it("are found transitively", () => {
    assert.deepEqual(dependents(["src/catalog/book.ts"], graph), [
      "src/catalog/index.ts",
      "src/http/routes.ts",
      "src/lending/service.ts",
    ]);
  });
});

describe("validation by change", () => {
  it("verifies the files that depend on a change, not only the change", () => {
    const result = plan("change", policy, change("src/catalog/book.ts"), graph, undefined);
    assert.equal(result.widened, null);
    assert.deepEqual(entry(result, "lint").scope, [
      "src/catalog/book.ts",
      "src/catalog/index.ts",
      "src/http/routes.ts",
      "src/lending/service.ts",
    ]);
    assert.equal(entry(result, "types").scope, "whole");
    assert.equal(entry(result, "mutation").scope, "changed");
  });

  it("reports a check with no affected input as not applicable", () => {
    const result = plan("change", policy, change("docs/guide.md"), graph, undefined);
    assert.equal(entry(result, "lint").decision, "not-applicable");
    assert.equal(entry(result, "docs").decision, "run");
  });

  it("widens on a shared configuration or policy change", () => {
    for (const file of ["package.json", "harness/policy.json"]) {
      const result = plan("change", policy, change(file), graph, undefined);
      assert.match(result.widened, /shared configuration changed/);
      for (const e of result.entries.filter((e) => e.check.cadence === "change")) {
        assert.equal(e.scope, e.check.scope === "changed" ? "changed" : "whole", e.check.id);
      }
      assert.equal(entry(result, "mutation-whole").decision, "periodic");
    }
  });

  it("widens when the impact cannot be established", () => {
    assert.match(wideningReason({ widened: "no base" }, policy, graph), /impact unknown: no base/);
    assert.match(wideningReason(change("src/a.ts"), policy, undefined), /graph could not be built/);
    assert.match(wideningReason(change("src/new.ts"), policy, graph), /cannot place src\/new.ts/);
    assert.match(
      wideningReason(
        { files: ["src/catalog/book.ts"], deleted: ["src/catalog/book.ts"] },
        policy,
        graph,
      ),
      /deleted modules/,
    );
  });

  it("widens on a change outside the project and on an import the graph cannot place", () => {
    assert.match(
      wideningReason(
        { files: [], deleted: [], outside: [".github/workflows/check.yml"] },
        policy,
        graph,
      ),
      /outside the project: .github\/workflows\/check.yml/,
    );
    const unresolved = new Map(graph);
    unresolved.unresolved = ["src/lending/service.ts"];
    assert.match(
      wideningReason(change("src/lending/other.ts"), policy, unresolved),
      /cannot place an import/,
    );
  });

  it("never hands a deleted file to a check, but still verifies its dependents", () => {
    const deletion = { files: ["src/catalog/book.ts", "docs/old.md"], deleted: ["docs/old.md"] };
    const result = plan("change", policy, deletion, graph, undefined);
    assert.ok(!entry(result, "lint").scope.includes("docs/old.md"));
    assert.equal(entry(result, "docs").decision, "run");
    const onlyDeleted = plan(
      "change",
      policy,
      { files: ["docs/old.md"], deleted: ["docs/old.md"] },
      graph,
      undefined,
    );
    assert.equal(entry(onlyDeleted, "lint").decision, "not-applicable");
  });

  it("selects the same checks over the same scopes for equivalent changes", () => {
    const a = plan("change", policy, change("src/lending/other.ts"), graph, undefined);
    const b = plan(
      "change",
      policy,
      change("src/lending/other.ts"),
      new Map([...graph].reverse()),
      undefined,
    );
    assert.deepEqual(
      a.entries.map((e) => [e.check.id, e.decision, e.scope]),
      b.entries.map((e) => [e.check.id, e.decision, e.scope]),
    );
  });

  it("reports a periodic check with its last integral result instead of running it", () => {
    const integral = {
      finishedAt: "t",
      commit: "c",
      policyVersion: "v",
      checks: { "mutation-whole": "passed" },
    };
    const result = plan("change", policy, change("src/lending/other.ts"), graph, integral);
    assert.deepEqual(entry(result, "mutation-whole"), {
      check: policy.checks[4],
      decision: "periodic",
      last: { outcome: "passed", at: "t", commit: "c", policyVersion: "v" },
      blocking: false,
    });
    assert.deepEqual(plan("change", policy, change("a.md"), graph, undefined).entries[4].last, {
      outcome: "not recorded",
    });
  });

  it("is not green while a periodic failure covers the change, and proceeds when the change is independent", () => {
    const integral = { checks: { "mutation-whole": "failed" } };
    assert.equal(
      entry(
        plan("change", policy, change("src/lending/other.ts"), graph, integral),
        "mutation-whole",
      ).blocking,
      true,
    );
    assert.equal(
      entry(plan("change", policy, change("docs/a.md"), graph, integral), "mutation-whole")
        .blocking,
      false,
    );
    assert.equal(
      entry(plan("change", policy, change("package.json"), graph, integral), "mutation-whole")
        .blocking,
      true,
    );
  });

  it("estimates the cost of what it would run", () => {
    assert.equal(
      cost(plan("change", policy, change("src/lending/other.ts"), graph, undefined).entries),
      30,
    );
  });
});

describe("integral validation", () => {
  it("runs every check over its whole input, periodic ones included", () => {
    const result = plan("integral", policy, null, null, null);
    assert.equal(entry(result, "mutation-whole").decision, "run");
    assert.equal(entry(result, "mutation").decision, "covered");
    assert.ok(result.entries.filter((e) => e.decision === "run").every((e) => e.scope === "whole"));
  });
});

describe("the project's policy", () => {
  const project = JSON.parse(readFileSync("harness/policy.json", "utf8"));

  it("gives every check a command, a tier, a cadence, a scope, and a cost", () => {
    for (const c of project.checks) {
      assert.ok(KNOWN_CHECKS.includes(c.id), `${c.id} has a command`);
      assert.ok(["fast", "full"].includes(c.tier), `${c.id} tier`);
      assert.ok(["change", "periodic"].includes(c.cadence), `${c.id} cadence`);
      assert.ok(["affected", "whole", "changed"].includes(c.scope), `${c.id} scope`);
      assert.ok(c.costSeconds > 0, `${c.id} cost`);
    }
  });

  it("states the protection and residual risk of every periodic check", () => {
    for (const c of project.checks.filter((c) => c.cadence === "periodic")) {
      assert.ok(c.schedule && c.cron && c.protectionBetweenRuns && c.residualRisk, c.id);
    }
  });

  it("fits a fully widened change in the budget", () => {
    const widened = plan("change", project, change("package.json"), new Map(), undefined);
    assert.ok(cost(widened.entries) <= project.budgetSeconds);
  });
});
