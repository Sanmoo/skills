// Gate: Lint.
//
// ESLint reports the defects and idioms the configured rule set knows about; a
// finding is a non-zero exit, never a warning. Under validation by change the
// policy narrows the Gate to the affected files through HARNESS_SCOPE.
import { outputOf, report, run, scopedFiles } from "./lib.mjs";

const LINTABLE = /\.(ts|mjs|cjs)$/;

const files = scopedFiles("Lint", "lintable", (file) => LINTABLE.test(file));
const lint = run("eslint", ["--max-warnings", "0", ...(files ?? ["."])]);
const failures = lint.status === 0 ? [] : [outputOf(lint)];

report("Lint", failures);
