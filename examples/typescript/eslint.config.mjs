import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// Lint Gate. The TypeScript rule set is strict and type-aware: a finding fails
// the Gate unless it is turned off here with a comment saying why. Complexity
// lives in eslint.metrics.config.mjs so that Static metrics owns it.
export default tseslint.config(
  {
    ignores: ["dist/", "reports/", "coverage/", "node_modules/", ".stryker-tmp/"],
  },
  {
    files: ["**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The service logs its listening port and shuts down from signal handlers.
      "no-console": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["**/*.mjs", "**/*.cjs"],
    extends: [eslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly" },
    },
  },
);
