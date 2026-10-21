// Mutation Gate configuration.
//
// Scope: the domain models that unit tests can kill. Adapters and application
// services are exercised by integration and e2e tests, which need containers
// and would make every mutant pay for one; they are covered at those levels.
//
// The per-context thresholds (80% overall, 90% in the core Lending context)
// are enforced by scripts/check-mutation.mjs, not by Stryker's global
// `thresholds.break`, because Stryker has no per-directory threshold.
export default {
  packageManager: "npm",
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.mutation.config.ts",
  },
  mutate: ["src/lending/domain/**/*.ts", "src/catalog/domain/**/*.ts", "!src/**/*.test.ts"],
  reporters: ["clear-text", "json"],
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
  coverageAnalysis: "perTest",
  concurrency: 2,
  timeoutMS: 30_000,
  thresholds: {
    high: 90,
    low: 80,
    break: 0,
  },
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
};
