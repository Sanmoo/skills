// E2E Gate configuration.
//
// The scenarios are English Gherkin, executed directly by Cucumber. Support
// code is TypeScript loaded through tsx; the full Entry Point builds dist/
// before this runs, and the scenarios drive that compiled service.
export default {
  import: ["features/support/**/*.ts", "features/step_definitions/**/*.ts"],
  paths: ["features/**/*.feature"],
  strict: true,
  order: "defined",
  format: ["progress"],
};
