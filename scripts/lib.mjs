import { execFileSync } from "node:child_process";

export function trackedFiles(...pathspecs) {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...pathspecs],
    { encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

// Yields [lineNumber, line] for lines outside fenced code blocks, with inline code removed.
export function* proseLines(text) {
  let fenced = false;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) yield [i + 1, lines[i].replace(/`[^`]*`/g, "")];
  }
}

export function report(gate, failures) {
  if (failures.length === 0) {
    console.log(`✔ ${gate}`);
    return;
  }
  console.error(`✘ ${gate}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
