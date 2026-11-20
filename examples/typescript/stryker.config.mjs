// Mutation Gate: Stryker with its Vitest runner over unit and integration
// tests. Which files are mutated, and the overall and core thresholds, are
// decided by scripts/check-mutation.mjs, which reads the JSON report: Stryker's
// own `thresholds.break` is global and cannot hold core contexts to more.
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.mutation.config.ts" },
  plugins: ["@stryker-mutator/vitest-runner"],
  coverageAnalysis: "perTest",
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  tempDirName: ".stryker-tmp",
  cleanTempDir: "always",
  concurrency: 2,
  timeoutMS: 10000,
  thresholds: { high: 90, low: 80, break: null },
};
