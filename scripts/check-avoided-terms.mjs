// Gate: no skill uses a term listed under _Avoid_ in GLOSSARY.md.
import { readFileSync } from "node:fs";
import { proseLines, report, trackedFiles } from "./lib.mjs";

const terms = readFileSync("GLOSSARY.md", "utf8")
  .split("\n")
  .filter((l) => l.startsWith("_Avoid_:"))
  .flatMap((l) => l.slice("_Avoid_:".length).split(","))
  .map((t) => t.trim())
  .filter(Boolean);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = terms.map((t) => [
  t,
  new RegExp(`\\b${t.split(/\s+/).map(escape).join("[\\s-]+")}s?\\b`, "i"),
]);

const failures = [];
for (const file of trackedFiles("skills/")) {
  if (!file.endsWith(".md")) continue;
  for (const [n, line] of proseLines(readFileSync(file, "utf8"))) {
    for (const [term, re] of patterns) {
      if (re.test(line)) failures.push(`${file}:${n} uses avoided term "${term}"`);
    }
  }
}
report("Avoided terms", failures);
