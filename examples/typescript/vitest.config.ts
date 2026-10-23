import { defineConfig } from "vitest/config";

// One project per test level defined in docs/guides/testing-strategy.md.
// Unit tests run offline; integration tests start real containers.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
});
