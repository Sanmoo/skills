// E2E Gate executor config. Strict mode (cucumber's default, stated here so it
// cannot drift) fails a run with an undefined or pending step; the Gate's
// wrapper, scripts/run-e2e.mjs, fails a run with no scenarios.
export default {
  paths: ["features/**/*.feature"],
  import: ["features/support/**/*.ts", "features/step_definitions/**/*.ts"],
  strict: true,
  format: ["progress", "message:reports/e2e/messages.ndjson"],
};
