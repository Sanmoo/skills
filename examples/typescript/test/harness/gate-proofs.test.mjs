// The proof runner's own rules: when a red Entry Point counts as a Gate Proof,
// and that the proof list is complete. A runner that miscounts would record a
// Gate as proved that never was.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { GATE_FLOOR, PROOFS, attribute } from "../../scripts/gate-proofs.mjs";

const lint = { gate: "Lint" };
const mutation = { gate: "Mutation", scope: ["src/lending/domain/loan.ts"] };
const report = (gate, outcome = "failed") => ({
  failed: { gate },
  checks: [{ gate, outcome, scope: "whole" }],
});

describe("Gate Proof attribution", () => {
  it("counts a red Entry Point whose failing check is the Gate under proof", () => {
    assert.equal(attribute(lint, 2, report("Lint")).outcome, "red because of the Gate");
  });

  it("does not count a green run, another Gate's failure, or a missing report", () => {
    assert.equal(attribute(lint, 0, report("Lint")).outcome, "not proved");
    assert.equal(attribute(lint, 2, report("Format")).outcome, "not proved");
    assert.equal(attribute(lint, 2, undefined).outcome, "not proved");
  });

  it("does not count a Gate named as failed that never ran", () => {
    assert.equal(
      attribute(lint, 2, { failed: { gate: "Lint" }, checks: [] }).outcome,
      "not proved",
    );
  });

  it("counts a scoped proof only when exactly the declared files were analyzed", () => {
    const red = report("Mutation");
    assert.equal(
      attribute(mutation, 2, red, { analyzed: ["src/lending/domain/loan.ts"] }).outcome,
      "red because of the Gate",
    );
    assert.equal(
      attribute(mutation, 2, red, { analyzed: ["src/lending/domain/loan.ts", "src/main.ts"] })
        .outcome,
      "not proved",
    );
    assert.equal(attribute(mutation, 2, red, { analyzed: [] }).outcome, "not proved");
  });

  it("does not count a scoped proof whose analysis never completed or left no record", () => {
    const red = report("Mutation");
    assert.equal(attribute(mutation, 2, red, { analyzed: "unavailable" }).outcome, "not proved");
    assert.deepEqual(attribute(mutation, 2, red, undefined).analyzed, "unavailable");
  });

  it("keeps both scopes in the evidence", () => {
    const result = attribute(mutation, 2, report("Mutation"), {
      analyzed: ["src/lending/domain/loan.ts"],
    });
    assert.deepEqual(result.declared, ["src/lending/domain/loan.ts"]);
    assert.deepEqual(result.analyzed, ["src/lending/domain/loan.ts"]);
  });
});

describe("the proof list", () => {
  it("proves every Gate in the Gate Floor exactly once", () => {
    assert.deepEqual([...PROOFS.map((p) => p.gate)].sort(), [...GATE_FLOOR].sort());
  });

  it("declares a scope only for the changed-set Gate", () => {
    assert.deepEqual(
      PROOFS.filter((p) => p.scope).map((p) => p.gate),
      ["Mutation"],
    );
  });
});

describe("the periodic cadence", () => {
  it("is the schedule the integral workflow runs", () => {
    const policy = JSON.parse(readFileSync("harness/policy.json", "utf8"));
    const workflow = readFileSync("../../.github/workflows/integral.yml", "utf8");
    const scheduled = [...workflow.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const check of policy.checks.filter((c) => c.cadence === "periodic")) {
      assert.ok(
        scheduled.includes(check.cron),
        `${check.id} runs on ${String(check.cron)}, workflow has ${scheduled.join(", ")}`,
      );
    }
  });
});
