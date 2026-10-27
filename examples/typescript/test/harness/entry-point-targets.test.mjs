// The fast Entry Point and the selection policy must agree on what is fast.
//
// `make check-fast` is the offline subset a pre-commit hook runs; the policy's
// `tier` field decides which tier the full Entry Point's modes may call a check
// in. If the two drift, a check added as fast never reaches the fast Entry
// Point, or one removed from it still runs through the mode. This check reads
// both versioned files and compares them, so the disagreement fails here rather
// than silently changing what a green fast run means.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

const PROJECT = dirname(dirname(import.meta.dirname));
const policy = JSON.parse(readFileSync(join(PROJECT, "harness", "policy.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(PROJECT, "package.json"), "utf8"));
const makefile = readFileSync(join(PROJECT, "Makefile"), "utf8");

function prerequisites(target) {
  const match = new RegExp(`^${target}\\s*:([^\\n]*)`, "m").exec(makefile);
  assert.ok(match, `the Makefile has no ${target} Entry Point`);
  return match[1].replace(/#.*$/, "").trim().split(/\s+/).filter(Boolean);
}

describe("Entry Point targets and the selection policy", () => {
  it("runs exactly the policy's fast change checks in the fast Entry Point", () => {
    const fast = policy.checks
      .filter((check) => check.cadence === "change" && check.tier === "fast")
      .map((check) => check.target)
      .sort();
    assert.deepEqual(prerequisites("check-fast").sort(), fast);
  });

  it("gives every check target a package script and no full-tier target the fast Entry Point", () => {
    const fast = new Set(prerequisites("check-fast"));
    for (const check of policy.checks) {
      assert.ok(
        packageJson.scripts[check.target] !== undefined,
        `${check.target} has no package script to run`,
      );
      if (check.tier === "full") {
        assert.equal(fast.has(check.target), false, `${check.target} is fast-tier and full-tier`);
      }
    }
  });
});
