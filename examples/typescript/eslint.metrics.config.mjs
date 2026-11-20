// Static metrics Gate: cyclomatic complexity per function. The limit is the
// Gate Contract's default. The target is first-party production code under
// src/; tests and tooling are non-production targets and are not measured.
import tseslint from "typescript-eslint";

export const COMPLEXITY_LIMIT = 10;

export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.test.ts"],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { reportUnusedDisableDirectives: "error", noInlineConfig: true },
    rules: { complexity: ["error", { max: COMPLEXITY_LIMIT }] },
  },
];
