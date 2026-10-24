// Gate: Avoided terms.
//
// Reads _Avoid_ lists straight from GLOSSARY.md and rejects any identifier in
// the TypeScript source that uses one of those terms. Identifiers are split on
// camelCase and snake_case boundaries; matching is case-insensitive and
// whole-word.
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { report } from "./lib.mjs";
import { SOURCE_TREES } from "./source-trees.mjs";

const SKIP_DIRECTORIES = /(^|\/)(node_modules|dist|reports|coverage|\.stryker-tmp)(\/|$)/;

function avoidedTerms(glossary) {
  return glossary
    .split("\n")
    .filter((line) => line.startsWith("_Avoid_:"))
    .flatMap((line) => line.slice("_Avoid_:".length).split(","))
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function sourceFiles(directory) {
  const files = [];
  const walk = (dir) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      if (SKIP_DIRECTORIES.test(path)) continue;
      if (item.isDirectory()) walk(path);
      else if (path.endsWith(".ts")) files.push(path);
    }
  };
  walk(directory);
  return files;
}

function tokensOf(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function matches(tokens, term) {
  const wanted = term.split(/\s+/).filter(Boolean);
  if (wanted.length === 0) return false;
  for (let start = 0; start + wanted.length <= tokens.length; start++) {
    let all = true;
    for (let offset = 0; offset < wanted.length; offset++) {
      const token = tokens[start + offset];
      if (token !== wanted[offset] && token !== `${wanted[offset]}s`) {
        all = false;
        break;
      }
    }
    if (all) return true;
  }
  return false;
}

const terms = avoidedTerms(readFileSync("GLOSSARY.md", "utf8"));
const failures = [];

for (const file of SOURCE_TREES.flatMap(sourceFiles)) {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isIdentifier(node)) {
      const tokens = tokensOf(node.text);
      for (const term of terms) {
        if (matches(tokens, term)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          failures.push(`${file}:${line + 1} uses avoided term "${term}"`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

report("Avoided terms", failures);
