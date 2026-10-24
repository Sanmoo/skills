import tseslint from "typescript-eslint";
import { SOURCE_TREES } from "./scripts/source-trees.mjs";

// Static metrics Gate: cyclomatic complexity at most 10 per function. This
// config runs only that rule, so the Gate Proof cannot be confused with Lint.
export default tseslint.config({
  ignores: ["**/*.test.ts"],
  files: SOURCE_TREES.map((directory) => `${directory}/**/*.ts`),
  languageOptions: {
    parser: tseslint.parser,
  },
  rules: {
    complexity: ["error", 10],
  },
});
