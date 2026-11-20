// Gate: every ADR in a docs/adr/ directory has a number no other ADR there uses.
import { basename, dirname } from "node:path";
import { report, trackedFiles } from "./lib.mjs";

const failures = [];
const seen = new Map();
for (const file of trackedFiles("docs/adr/*.md", "*/docs/adr/*.md")) {
  const number = basename(file).match(/^(\d{4})-/)?.[1];
  if (!number) {
    failures.push(`${file} is not named NNNN-<slug>.md`);
    continue;
  }
  const key = `${dirname(file)}/${number}`;
  if (seen.has(key)) failures.push(`${file} reuses ADR ${number} from ${seen.get(key)}`);
  else seen.set(key, file);
}
report("ADR numbers", failures);
