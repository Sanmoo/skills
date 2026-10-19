// Gate: every relative Markdown link resolves to an existing file.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { proseLines, report, trackedFiles } from "./lib.mjs";

const failures = [];
for (const file of trackedFiles("*.md")) {
  for (const [n, line] of proseLines(readFileSync(file, "utf8"))) {
    for (const [, target] of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      const path = decodeURIComponent(target.split("#")[0]);
      if (!existsSync(join(dirname(file), path))) failures.push(`${file}:${n} → ${target}`);
    }
  }
}
report("Guide pointers", failures);
