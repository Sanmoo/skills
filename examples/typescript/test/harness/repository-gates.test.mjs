// The two Gates this repository implements itself.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { avoidedTerms, findAvoidedTerms, splitWords } from "../../scripts/check-avoided-terms.mjs";
import { checkGuide } from "../../scripts/check-guide-pointers.mjs";

describe("Avoided terms", () => {
  const glossary =
    "**Loan**:\nA loan.\n_Avoid_: checkout, rental\n\n**Borrower**:\n_Avoid_: patron, library card\n";

  it("reads every term under _Avoid_", () => {
    assert.deepEqual(
      avoidedTerms(glossary).map((t) => t.term),
      ["checkout", "rental", "patron", "library card"],
    );
  });

  it("splits camelCase, PascalCase, snake_case and kebab-case on whole words", () => {
    assert.deepEqual(splitWords("newRentalID_forPatron-x"), [
      "new",
      "rental",
      "id",
      "for",
      "patron",
      "x",
    ]);
  });

  it("finds an avoided term in an identifier, case-insensitively, on whole words", () => {
    const failures = findAvoidedTerms(glossary, [
      ["a.ts", "const loanRental = 1;\nclass PatronCard {}\nconst libraryCardNumber = 2;"],
    ]);
    assert.equal(failures.length, 3);
    assert.match(failures[0], /a.ts:1 identifier "loanRental" uses avoided term "rental"/);
  });

  it("ignores strings, comments, and partial words", () => {
    assert.deepEqual(
      findAvoidedTerms(glossary, [["a.ts", '// rental\nconst s = "patron";\nconst rentals = 1;']]),
      [],
    );
  });
});

describe("Guide pointers", () => {
  it("accepts the Entry Points and paths that resolve", () => {
    assert.deepEqual(
      checkGuide(
        "AGENTS.md",
        "Run `make check` or `make check MODE=integral`; see `harness/policy.json`.",
      ),
      [],
    );
  });

  it("rejects a command that is not an Entry Point", () => {
    assert.match(
      checkGuide("AGENTS.md", "Run `npm test`.")[0],
      /command `npm test` is not an Entry Point/,
    );
  });

  it("treats a bare path that starts with a tool name as a path", () => {
    assert.match(checkGuide("AGENTS.md", "See `make.md`.")[0], /path `make.md` does not resolve/);
  });

  it("rejects a link or a path that does not resolve, outside code fences", () => {
    const failures = checkGuide(
      "AGENTS.md",
      "[x](docs/nope.md) and `src/nope.ts`\n```\n[y](nope.md)\n```\n",
    );
    assert.equal(failures.length, 2);
  });
});
