// Gate: Format.
//
// Prettier checks that every source file already matches the formatter's
// output: check mode, never rewrite. Under validation by change the policy
// narrows the Gate to the affected files, which reach it as HARNESS_SCOPE; with
// no scope it verifies the whole tree, as integral validation and a direct run
// of the Gate target do.
import { report, run } from "./lib.mjs";

const FORMATTABLE = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|md|yml|yaml)$/;

function scopedFiles() {
  const declared = process.env.HARNESS_SCOPE;
  if (declared === undefined) return undefined;
  const files = JSON.parse(declared).filter((file) => FORMATTABLE.test(file));
  if (files.length === 0) {
    report("Format", ["HARNESS_SCOPE names no formattable file, so the Gate would verify nothing"]);
  }
  return files;
}

const files = scopedFiles();
const prettier = run("prettier", ["--check", ...(files ?? ["."])]);

report("Format", prettier.status === 0 ? [] : [`${prettier.stdout ?? ""}${prettier.stderr ?? ""}`]);
