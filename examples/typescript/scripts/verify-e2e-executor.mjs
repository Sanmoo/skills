// Verifies, on a disposable copy, that the E2E Gate's executor fails rather
// than passes on each case its Contract names: a wrong assertion, no
// scenarios, an undefined step, a pending step, and an artifact that does not
// start. Kept out of both Entry Points; run with `npm run verify-e2e-executor`.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { disposableCopy } from "./disposable-copy.mjs";

const STEPS = "features/step_definitions/library_lending.steps.ts";
const FEATURE = "features/library_lending.feature";

const cases = [
  { name: "the unmodified suite passes", expect: "pass", apply: () => {} },
  {
    name: "a wrong assertion fails",
    expect: "fail",
    apply: (dir) => {
      const path = join(dir, STEPS);
      writeFileSync(
        path,
        readFileSync(path, "utf8").replace(
          "assert.equal(this.lastAnswer?.status, 404);",
          "assert.equal(this.lastAnswer?.status, 200);",
        ),
      );
    },
  },
  { name: "no scenarios fails", expect: "fail", apply: (dir) => rmSync(join(dir, FEATURE)) },
  {
    name: "an undefined step fails",
    expect: "fail",
    apply: (dir) => appendFileSync(join(dir, FEATURE), "    And the Catalog is dusted\n"),
  },
  {
    name: "a pending step fails",
    expect: "fail",
    apply: (dir) => {
      appendFileSync(join(dir, FEATURE), "    And the Catalog is dusted\n");
      appendFileSync(
        join(dir, STEPS),
        '\nThen("the Catalog is dusted", function () {\n  return "pending";\n});\n',
      );
    },
  },
  {
    name: "an artifact that does not start fails",
    expect: "fail",
    env: { E2E_ARTIFACT: "dist/broken.js" },
    apply: (dir) =>
      writeFileSync(
        join(dir, "dist/broken.js"),
        'console.error("refusing to start");\nprocess.exit(1);\n',
      ),
  },
];

const build = spawnSync("node_modules/.bin/tsc", ["-p", "tsconfig.build.json"], {
  stdio: "inherit",
});
if (build.status !== 0) process.exit(1);

let wrong = 0;
for (const testCase of cases) {
  const copy = disposableCopy("e2e-executor-");
  try {
    spawnSync("node_modules/.bin/tsc", ["-p", "tsconfig.build.json"], {
      cwd: copy.dir,
      stdio: "inherit",
    });
    testCase.apply(copy.dir);
    const run = spawnSync(process.execPath, ["scripts/run-e2e.mjs"], {
      cwd: copy.dir,
      encoding: "utf8",
      env: { ...process.env, ...testCase.env },
    });
    const outcome = run.status === 0 ? "pass" : "fail";
    const ok = outcome === testCase.expect;
    if (!ok) wrong++;
    console.log(`${ok ? "✔" : "✘"} ${testCase.name}: the executor exited ${String(run.status)}`);
    if (!ok) console.log(run.stdout + run.stderr);
  } finally {
    copy.remove();
  }
}
process.exit(wrong === 0 ? 0 : 1);
