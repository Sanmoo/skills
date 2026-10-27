// Gate: Unit tests and Integration tests.
//
// One level per invocation; the level's project is the one vitest.config.ts
// defines. Under validation by change the policy narrows the Gate to the
// affected test files through HARNESS_SCOPE; with no scope the whole level
// runs, as integral validation and a direct run of the Gate target do.
import { outputOf, report, run, scopedFiles } from "./lib.mjs";

const level = process.argv[2];
const PROJECT = { unit: "unit", integration: "integration" }[level];
const GATE = { unit: "Unit tests", integration: "Integration tests" }[level];
if (PROJECT === undefined) {
  report("Unit tests", [`unknown test level "${level}"`]);
}

const files = scopedFiles(GATE, `${level} test`, (file) =>
  level === "unit"
    ? file.endsWith(".test.ts") && !file.endsWith(".integration.test.ts")
    : file.endsWith(".integration.test.ts"),
);
const tests = run("vitest", ["run", "--project", PROJECT, ...(files ?? [])]);

report(GATE, tests.status === 0 ? [] : [outputOf(tests) || "vitest exited non-zero"]);
