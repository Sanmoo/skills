// Guide pointers Gate: every relative link and file path in the Guides
// resolves, and every command a Guide names is an Entry Point or a mode of the
// full Entry Point. A command is a tool name followed by an argument; a bare
// path that starts with a tool name, such as `make.md`, is a path.
import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { listFiles, report } from "./lib.mjs";

export const ENTRY_POINTS = [
  "make check",
  "make check-fast",
  "make check MODE=change",
  "make check MODE=integral",
];
const TOOLS = new Set([
  "make",
  "npm",
  "npx",
  "node",
  "git",
  "docker",
  "mise",
  "tsx",
  "tsc",
  "vitest",
  "eslint",
  "prettier",
  "stryker",
  "cucumber-js",
  "depcruise",
  "jscpd",
  "gitleaks",
]);
const PATH_LIKE = /^[\w.@*-]+(\/[\w.@*-]*)*$/;
const FILE_EXTENSION = /\.(md|ts|mts|mjs|cjs|js|json|toml|ya?ml|feature|txt)$/;

export function guideFiles() {
  return ["AGENTS.md", "GLOSSARY.md", ...listFiles(["docs/guides", "docs/adr"], /\.md$/)];
}

function* proseLines(text) {
  let fenced = false;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) yield [i + 1, lines[i]];
  }
}

function resolves(file, target) {
  const candidates = [join(dirname(file), target), target];
  if (target.includes("*")) return candidates.some((pattern) => globSync(pattern).length > 0);
  return candidates.some((path) => existsSync(path));
}

function checkLink(file, n, target) {
  if (/^([a-z][a-z0-9+.-]*:|#)/i.test(target)) return [];
  const path = decodeURIComponent(target.split("#")[0]);
  return existsSync(join(dirname(file), path))
    ? []
    : [`${file}:${String(n)} link → ${target} does not resolve`];
}

function checkCode(file, n, span) {
  const words = span.trim().split(/\s+/);
  if (TOOLS.has(words[0]) && words.length > 1) {
    return ENTRY_POINTS.includes(words.join(" "))
      ? []
      : [
          `${file}:${String(n)} command \`${span}\` is not an Entry Point (${ENTRY_POINTS.join(", ")})`,
        ];
  }
  const isPath =
    words.length === 1 && PATH_LIKE.test(span) && (span.includes("/") || FILE_EXTENSION.test(span));
  if (!isPath || resolves(file, span)) return [];
  return [`${file}:${String(n)} path \`${span}\` does not resolve`];
}

export function checkGuide(file, text) {
  const failures = [];
  for (const [n, line] of proseLines(text)) {
    for (const [, target] of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g))
      failures.push(...checkLink(file, n, target));
    for (const [, span] of line.matchAll(/`([^`]+)`/g)) failures.push(...checkCode(file, n, span));
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = guideFiles().flatMap((file) =>
    existsSync(file) ? checkGuide(file, readFileSync(file, "utf8")) : [`${file} is missing`],
  );
  report("Guide pointers", failures);
}
