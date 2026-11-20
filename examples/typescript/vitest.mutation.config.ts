// The Mutation Gate's test run: unit and integration tests together, so a
// mutant in an adapter is judged by the tests that drive it against Postgres.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["test/support/postgres.ts"],
    fileParallelism: false,
    hookTimeout: 120_000,
    // A mutant that leaves a request unanswered fails its test here instead of
    // waiting for Stryker's own, much longer, timeout.
    testTimeout: 5_000,
  },
});
