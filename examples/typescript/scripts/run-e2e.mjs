// E2E Gate: runs the Gherkin scenarios with the pinned executor against the
// built artifact, and refuses a run that passes vacuously. Cucumber's strict
// mode already fails an undefined or pending step and a failing hook (the
// artifact not starting); this wrapper adds the case cucumber accepts: a run
// with no scenarios at all.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";

const MESSAGES = "reports/e2e/messages.ndjson";
const artifact = process.env.E2E_ARTIFACT ?? "dist/main.js";

if (!existsSync(artifact)) {
  console.error(
    `E2E: the built artifact ${artifact} does not exist; the Entry Point builds it first.`,
  );
  process.exit(1);
}

rmSync("reports/e2e", { recursive: true, force: true });
const run = spawnSync(
  process.execPath,
  ["node_modules/@cucumber/cucumber/bin/cucumber.js", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import tsx`.trim() },
  },
);

const messages = existsSync(MESSAGES)
  ? readFileSync(MESSAGES, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : [];
const scenarios = messages.filter((m) => m.testCaseStarted).length;
const finished = messages.find((m) => m.testRunFinished)?.testRunFinished;

if (run.status !== 0) {
  console.error(`E2E: the executor exited with status ${String(run.status)}.`);
  process.exit(1);
}
if (finished?.success !== true) {
  console.error("E2E: the executor did not report a successful run.");
  process.exit(1);
}
if (scenarios === 0) {
  console.error("E2E: no scenario ran; a run without scenarios does not satisfy the Gate.");
  process.exit(1);
}
console.log(`E2E: ${String(scenarios)} scenarios passed against ${artifact}.`);
