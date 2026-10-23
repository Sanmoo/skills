import { defineConfig } from "vitest/config";

// Mutation testing runs only the unit level: domain code is killed by unit
// tests, and integration tests would start a container per mutant.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    environment: "node",
  },
});
