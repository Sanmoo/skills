// The Gate Proof's declared scope: it replaces the changed set for one
// execution, and an empty, missing, or ineligible declaration is refused
// instead of widening or falling back to the ordinary selection.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidScope, declaredScope } from "../../scripts/mutation-scope.mjs";

const policy = { eligible: "^src/.+\\.ts$", ineligible: "\\.test\\.ts$" };
const exists = (file) => !file.includes("missing");

describe("declared mutation scope", () => {
  it("is absent when nothing is declared", () => {
    assert.equal(declaredScope(undefined, policy, exists), undefined);
  });

  it("returns exactly the declared files", () => {
    assert.deepEqual(declaredScope("src/a.ts, src/b.ts", policy, exists), ["src/a.ts", "src/b.ts"]);
  });

  it("refuses an explicitly empty declaration", () => {
    assert.throws(
      () => declaredScope(" , ", policy, exists),
      new InvalidScope("the declared mutation scope is empty"),
    );
  });

  it("refuses a missing file", () => {
    assert.throws(
      () => declaredScope("src/missing.ts", policy, exists),
      /missing file: src\/missing.ts/,
    );
  });

  it("refuses an ineligible file", () => {
    assert.throws(
      () => declaredScope("src/a.test.ts", policy, exists),
      /ineligible file: src\/a.test.ts/,
    );
    assert.throws(() => declaredScope("scripts/a.mjs", policy, exists), /ineligible file/);
  });
});
