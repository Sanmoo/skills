// Gate: Lint.
//
// ESLint reports the defects and idioms the configured rule set knows about; a
// finding is a non-zero exit, never a warning. Under validation by change the
// policy narrows the Gate to the affected files through HARNESS_SCOPE.
import { outputOf, report, run } from "./lib.mjs";

const LINTABLE = /\.(ts|mjs|cjs)$/;

function scopedFiles() {
  const declared = process.env.HARNESS_SCOPE;
  if (declared === undefined) return undefined;
  const files = JSON.parse(declared).filter((file) => LINTABLE.test(file));
  if (files.length === 0) {
    report("Lint", ["HARNESS_SCOPE names no lintable file, so the Gate would verify nothing"]);
  }
  return files;
}

const files = scopedFiles();
const lint = run("eslint", ["--max-warnings", "0", ...(files ?? ["."])]);
const failures = lint.status === 0 ? [] : [outputOf(lint)];

report("Lint", failures);
