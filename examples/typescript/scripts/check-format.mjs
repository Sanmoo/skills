// Gate: Format.
//
// Prettier checks that every source file already matches the formatter's
// output: check mode, never rewrite. Under validation by change the policy
// narrows the Gate to the affected files, which reach it as HARNESS_SCOPE; with
// no scope it verifies the whole tree, as integral validation and a direct run
// of the Gate target do.
import { report, run, scopedFiles } from "./lib.mjs";

const FORMATTABLE = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|md|yml|yaml)$/;

const files = scopedFiles("Format", "formattable", (file) => FORMATTABLE.test(file));
const prettier = run("prettier", ["--check", ...(files ?? ["."])]);

report("Format", prettier.status === 0 ? [] : [`${prettier.stdout ?? ""}${prettier.stderr ?? ""}`]);
