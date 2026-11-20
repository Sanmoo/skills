// Lint Gate rule set. Complexity is not here: it belongs to the Static
// metrics Gate, configured in eslint.metrics.config.mjs.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Generated output and third-party code are not first-party source.
  { ignores: ["node_modules/", "dist/", "reports/", ".stryker-tmp/"] },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
);
