import { defineConfig } from "vitest/config";

const integration = ["src/**/*.integration.test.ts"];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: integration,
        },
      },
      {
        test: {
          name: "integration",
          include: integration,
          globalSetup: ["test/support/postgres.ts"],
          // The contexts share one Postgres and own fixed schemas.
          fileParallelism: false,
          hookTimeout: 120_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
