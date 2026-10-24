// Gate: E2E tests.
//
// Cucumber runs the English Gherkin scenarios directly. This wrapper adds the
// one check Cucumber leaves to its caller: a suite that selects no scenarios
// reports success, and the Gate Contract requires that to fail.
import { loadConfiguration, loadSources, runCucumber } from "@cucumber/cucumber/api";

const { runConfiguration } = await loadConfiguration();

const { plan, errors } = await loadSources(runConfiguration.sources);
if (errors.length > 0) {
  for (const error of errors) {
    console.error(`${error.uri}:${error.location.line}: ${error.message}`);
  }
  process.exit(1);
}
if (plan.length === 0) {
  console.error("E2E tests: no scenarios selected");
  process.exit(1);
}

const result = await runCucumber(runConfiguration);
process.exit(result.success ? 0 : 1);
