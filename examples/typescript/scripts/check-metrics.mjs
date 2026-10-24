// Gate: Static metrics.
//
// Three pinned local tools, three absolute limits:
//   - cyclomatic complexity at most 10 per function (ESLint complexity rule);
//   - zero dependency cycles between modules (dependency-cruiser);
//   - duplicated code at most 3% (jscpd).
import { outputOf, report, run } from "./lib.mjs";

// The structural limits follow the TypeScript code, including the e2e steps and
// test support, not only the production source tree.
const METRIC_TARGETS = ["src", "features", "test"];
const failures = [];

const complexity = run("eslint", [
  "--config",
  "eslint.metrics.config.mjs",
  "--max-warnings",
  "0",
  ...METRIC_TARGETS,
]);
if (complexity.status !== 0) {
  failures.push(`complexity above 10:\n${outputOf(complexity)}`);
}

const cycles = run("depcruise", [
  "--config",
  ".dependency-cruiser.cycles.cjs",
  "--output-type",
  "err",
  ...METRIC_TARGETS,
]);
if (cycles.status !== 0) {
  failures.push(`dependency cycle:\n${outputOf(cycles)}`);
}

const duplication = run("jscpd", ["--config", ".jscpd.json", ...METRIC_TARGETS]);
if (duplication.status !== 0) {
  failures.push(`duplicated code above 3%:\n${outputOf(duplication)}`);
}

report("Static metrics", failures);
