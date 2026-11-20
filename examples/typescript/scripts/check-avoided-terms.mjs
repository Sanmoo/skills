// Avoided terms Gate: no identifier in source code contains a term GLOSSARY.md
// lists under _Avoid_. Identifiers come from the TypeScript parser, so strings
// and comments are not identifiers. They are split on camelCase, snake_case,
// and kebab-case boundaries and matched case-insensitively on whole words.
import { readFileSync } from "node:fs";
import ts from "typescript";
import { listFiles, report } from "./lib.mjs";

// Source code the Gate reads: production code, its tests, and the e2e steps.
const SOURCE_DIRS = ["src", "test", "features"];

export function avoidedTerms(glossary) {
  return [...glossary.matchAll(/^_Avoid_:(.*)$/gm)].flatMap(([, list]) =>
    list
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean)
      .map((term) => ({ term, words: splitWords(term) })),
  );
}

export function splitWords(name) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .flatMap((part) => part.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) ?? [])
    .map((word) => word.toLowerCase());
}

export function containsTerm(words, termWords) {
  for (let i = 0; i + termWords.length <= words.length; i++) {
    if (termWords.every((word, j) => words[i + j] === word)) return true;
  }
  return false;
}

export function identifiers(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found = [];
  const visit = (node) => {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push({ name: node.text, line: line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export function findAvoidedTerms(glossary, files) {
  const terms = avoidedTerms(glossary);
  const failures = [];
  for (const [file, text] of files) {
    for (const { name, line } of identifiers(file, text)) {
      const words = splitWords(name);
      for (const { term, words: termWords } of terms) {
        if (containsTerm(words, termWords))
          failures.push(`${file}:${String(line)} identifier "${name}" uses avoided term "${term}"`);
      }
    }
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = listFiles(SOURCE_DIRS, /\.(ts|mts|mjs)$/).map((file) => [
    file,
    readFileSync(file, "utf8"),
  ]);
  report("Avoided terms", findAvoidedTerms(readFileSync("GLOSSARY.md", "utf8"), files));
}
