import tseslint from "typescript-eslint";

// Static metrics Gate: cyclomatic complexity at most 10 per function. This
// config runs only that rule, so the Gate Proof cannot be confused with Lint.
export default tseslint.config({
  ignores: ["**/*.test.ts"],
  files: ["src/**/*.ts", "features/**/*.ts", "test/**/*.ts"],
  languageOptions: {
    parser: tseslint.parser,
  },
  rules: {
    complexity: ["error", 10],
  },
});
