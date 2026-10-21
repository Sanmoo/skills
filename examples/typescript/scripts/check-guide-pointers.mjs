// Gate: Guide pointers.
//
// Every relative link and file path in a Guide resolves, and every command a
// Guide names is one of the two Entry Points.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { report, run } from "./lib.mjs";

const GUIDE_FILES = ["AGENTS.md", "GLOSSARY.md"];

function guideFiles() {
  const files = [...GUIDE_FILES];
  const result = run("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "docs/guides",
    "docs/adr",
  ]);
  for (const path of result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)) {
    if (path.endsWith(".md")) files.push(path);
  }
  for (const file of ["docs/guides", "docs/adr"]) {
    if (!existsSync(file)) files.push(`${file} is missing`);
  }
  return files;
}

const ENTRY_POINTS = new Set(["make check", "make check-fast"]);
const COMMAND =
  /^(make|npm|npx|node|docker|mise|git|tsc|vitest|eslint|prettier|stryker|depcruise|jscpd|gitleaks)(\s+|$)/;

const failures = [];
for (const file of guideFiles()) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing`);
    continue;
  }
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    const where = `${file}:${index + 1}`;
    for (const [, target] of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
      const path = decodeURIComponent(target.split("#")[0]);
      if (!existsSync(join(dirname(file), path)))
        failures.push(`${where} link does not resolve: ${target}`);
    }
    for (const [, span] of line.matchAll(/`([^`]+)`/g)) {
      const command = span.trim();
      if (COMMAND.test(command) && !ENTRY_POINTS.has(command)) {
        failures.push(`${where} names a command that is not an Entry Point: ${command}`);
      }
    }
  });
}

report("Guide pointers", failures);
