// Gate Proofs: for each Gate, introduce the smallest violation it exists to
// catch, run the Entry Point of its tier with only that violation present, and
// confirm it goes red because of that Gate; then restore the tree before the
// next proof. Kept out of both Entry Points; run with `npm run gate-proofs`
// (or `npm run gate-proofs -- Mutation` for one Gate). The report it writes,
// reports/gate-proofs.json, is run output; GATE-PROOFS.md is the record.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// Every Gate Contract in the Gate Floor, as the policy names its Gate.
export const GATE_FLOOR = [
  "Format",
  "Lint",
  "Types",
  "Unit tests",
  "Integration tests",
  "E2E tests",
  "Mutation",
  "Context boundaries",
  "Dependency rule",
  "Static metrics",
  "Dependency vulnerabilities",
  "Secrets",
  "Avoided terms",
  "Guide pointers",
];

const replace = (file, from, to) => ({ file, from, to });
const append = (file, text) => ({ file, append: text });
const create = (file, text) => ({ file, create: text });

export const PROOFS = [
  {
    gate: "Format",
    violation: "misindent one line of the Catalog domain",
    edits: [
      replace(
        "src/catalog/domain/book.ts",
        "  const bookId = id.trim();",
        "    const bookId = id.trim();",
      ),
    ],
  },
  {
    gate: "Lint",
    violation: "add an unused variable to the Catalog domain",
    edits: [append("src/catalog/domain/book.ts", "\nconst unusedProof = 1;\n")],
  },
  {
    gate: "Types",
    violation: "pass a number where registerBook takes the title string",
    edits: [
      replace(
        "src/catalog/application/catalog-service.ts",
        "const book = registerBook(id, title);",
        "const book = registerBook(id, title.length);",
      ),
    ],
  },
  {
    gate: "Unit tests",
    violation: "invert the Overdue condition in the Lending domain",
    edits: [
      replace(
        "src/lending/domain/loan.ts",
        "dayOf(today) > loan.dueDate",
        "dayOf(today) < loan.dueDate",
      ),
    ],
  },
  {
    gate: "Context boundaries",
    violation: "import the Catalog's non-public domain module from Lending",
    edits: [
      replace(
        "src/lending/application/lending-service.ts",
        'import type { CatalogService } from "../../catalog/index.js";',
        'import type { CatalogService } from "../../catalog/index.js";\nimport type { Book } from "../../catalog/domain/book.js";\n\nexport type ProofBook = Book;',
      ),
    ],
  },
  {
    gate: "Dependency rule",
    violation: "import the Postgres client in the Lending domain",
    edits: [
      replace("src/lending/domain/loan.ts", "/** Days between", 'import "pg";\n\n/** Days between'),
    ],
  },
  {
    gate: "Static metrics",
    violation: "write a function with eleven independent branches (complexity 12)",
    edits: [
      append(
        "src/catalog/domain/book.ts",
        `
export function shelfOf(code: number): string {
${Array.from({ length: 11 }, (_, i) => `  if (code === ${String(i)}) return "shelf ${String(i)}";`).join("\n")}
  return "unshelved";
}
`,
      ),
    ],
  },
  {
    gate: "Secrets",
    violation:
      "add a file containing a well-formed fake AWS access key (base32 body, as the rule requires)",
    // Assembled at run time, so no committed file carries a well-formed key.
    edits: [
      create(
        "config/proof.env",
        `AWS_ACCESS_KEY_ID=${["AKIA", "Z4Q7VXD2", "LMB3K4WT"].join("")}\n`,
      ),
    ],
  },
  {
    gate: "Avoided terms",
    violation: "rename the Borrower's local name in the Lending domain to an avoided synonym",
    edits: [
      replace(
        "src/lending/domain/loan.ts",
        "  const name = borrower.trim();",
        "  const patron = borrower.trim();",
      ),
      replace("src/lending/domain/loan.ts", '  if (name === "")', '  if (patron === "")'),
      replace("src/lending/domain/loan.ts", "    borrower: name,", "    borrower: patron,"),
    ],
  },
  {
    gate: "Guide pointers",
    violation: "point a Guide link at a file that does not exist",
    edits: [
      replace(
        "AGENTS.md",
        "(docs/guides/architecture.md)",
        "(docs/guides/architecture-missing.md)",
      ),
    ],
  },
  {
    gate: "Integration tests",
    violation: "map a Book's title from the wrong column in the Catalog adapter",
    edits: [
      replace(
        "src/catalog/adapters/postgres-book-repository.ts",
        "{ id: row.id, title: row.title }",
        "{ id: row.id, title: row.id }",
      ),
    ],
  },
  {
    gate: "E2E tests",
    violation: "drop the route that reaches Lending's Loan creation from the shipped composition",
    edits: [
      replace("src/main.ts", "...lendingRoutes(lending)]", "...lendingRoutes(lending).slice(1)]"),
    ],
  },
  {
    gate: "Mutation",
    violation:
      "delete the assertions of the core Lending tests that cover the Loan, at both levels the mutation run executes",
    scope: ["src/lending/domain/loan.ts"],
    // The tests still exercise the Loan; only what they assert is gone. The
    // mutation run executes unit and integration tests, so deleting the unit
    // assertions alone leaves the integration tests killing the mutants.
    edits: [
      create(
        "src/lending/domain/loan.test.ts",
        `import { it } from "vitest";
import { isOverdue, recordReturn, takeOnLoan } from "./loan.js";

it("exercises a Loan without asserting anything", () => {
  const loan = takeOnLoan("loan-1", "b", " Ada ", new Date("2026-03-01T00:00:00Z"));
  isOverdue(recordReturn(loan, new Date("2026-03-20T00:00:00Z")), new Date("2026-04-01T00:00:00Z"));
});
`,
      ),
      create(
        "src/lending/application/lending-service.integration.test.ts",
        `import { it } from "vitest";
import { useDatabase } from "../../../test/support/database.js";
import { createCatalog } from "../../catalog/index.js";
import { createLending } from "../index.js";

const pool = useDatabase();

it("exercises Lending without asserting anything", async () => {
  const catalog = await createCatalog(pool);
  await catalog.register("dispossessed", "The Dispossessed");
  const lending = await createLending(pool, catalog);
  const loan = await lending.lend("dispossessed", "Ada");
  await lending.consult(loan.id);
  await lending.recordReturn(loan.id);
});
`,
      ),
    ],
  },
  {
    gate: "Dependency vulnerabilities",
    violation: "lock lodash 4.17.4, which has published critical advisories",
    edits: [
      {
        npm: [
          "install",
          "--package-lock-only",
          "--no-audit",
          "--no-fund",
          "--save-exact",
          "lodash@4.17.4",
        ],
      },
    ],
    touches: ["package.json", "package-lock.json"],
  },
];

const policy = JSON.parse(readFileSync("harness/policy.json", "utf8"));
const tierOf = (gate) => policy.checks.find((c) => c.gate === gate && c.cadence === "change")?.tier;
const entryPointOf = (tier) => (tier === "fast" ? ["check-fast"] : ["check"]);

function status() {
  return execFileSync("git", ["status", "--porcelain", "--", "."], { encoding: "utf8" }).trim();
}

function refuseUnattributable(selected) {
  const gates = PROOFS.map((p) => p.gate);
  const duplicated = gates.filter((g, i) => gates.indexOf(g) !== i);
  const unproved = GATE_FLOOR.filter((g) => !gates.includes(g));
  const unknown = gates.filter((g) => !policy.checks.some((c) => c.gate === g));
  const problems = [
    ...duplicated.map((g) => `two proofs claim ${g}`),
    ...unproved.map((g) => `${g} has no proof`),
    ...unknown.map((g) => `${g} is not a Gate the policy runs`),
  ];
  if (selected.length === 0) problems.push("no proof matches the requested Gates");
  if (status() !== "") problems.push(`the tree is not clean:\n${status()}`);
  if (problems.length > 0) {
    console.error(`Gate Proofs refused:\n  ${problems.join("\n  ")}`);
    process.exit(2);
  }
}

function apply(edit) {
  if (edit.npm) {
    execFileSync("npm", edit.npm, { stdio: "inherit" });
    return;
  }
  if (edit.create !== undefined) {
    mkdirSync(edit.file.split("/").slice(0, -1).join("/") || ".", { recursive: true });
    writeFileSync(edit.file, edit.create);
    return;
  }
  const text = readFileSync(edit.file, "utf8");
  let next;
  if (edit.append !== undefined) next = text + edit.append;
  else if (edit.deleteLines)
    next = text
      .split("\n")
      .filter((line) => !edit.deleteLines.test(line))
      .join("\n");
  else {
    if (!text.includes(edit.from))
      throw new Error(
        `proof edit does not apply: ${edit.file} has no ${JSON.stringify(edit.from)}`,
      );
    next = text.replace(edit.from, edit.to);
  }
  if (next === text) throw new Error(`proof edit changed nothing in ${edit.file}`);
  writeFileSync(edit.file, next);
}

function restore() {
  execFileSync("git", ["checkout", "--", "."]);
  execFileSync("git", ["clean", "-fdq", "--", "."]);
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

/**
 * Whether one proof's run went red because of its Gate: the Entry Point
 * failed, the failing check is the Gate under proof, that check actually ran
 * and failed, and a declared scope was analyzed exactly as declared by an
 * analysis that completed. A missing report or scope record attributes nothing.
 */
export function attribute(proof, exitStatus, report, scopeRecord) {
  const failingGate = report?.failed?.gate ?? null;
  const ran = report?.checks.find((c) => c.gate === proof.gate && c.outcome === "failed");
  const result = { failingGate, scope: ran ? ran.scope : null };
  if (proof.scope) {
    result.declared = proof.scope;
    result.analyzed = scopeRecord?.analyzed ?? "unavailable";
  }
  const scopeHeld =
    !proof.scope ||
    (Array.isArray(result.analyzed) &&
      JSON.stringify(result.analyzed) === JSON.stringify(proof.scope));
  result.outcome =
    exitStatus !== 0 && failingGate === proof.gate && ran !== undefined && scopeHeld
      ? "red because of the Gate"
      : "not proved";
  return result;
}

function prove(proof) {
  const tier = tierOf(proof.gate);
  const target = entryPointOf(tier);
  const reportFile = tier === "fast" ? "reports/fast.json" : "reports/validation.json";
  rmSync(reportFile, { force: true });
  rmSync("reports/mutation/scope.json", { force: true });
  const record = {
    gate: proof.gate,
    tier,
    entryPoint: `make ${target.join(" ")}`,
    violation: proof.violation,
  };
  try {
    for (const edit of proof.edits) apply(edit);
    record.files = proof.touches ?? [...new Set(proof.edits.map((e) => e.file))];
    const env = { ...process.env };
    delete env.MUTATION_SCOPE;
    if (proof.scope) env.MUTATION_SCOPE = proof.scope.join(",");
    console.log(`\n### ${proof.gate}: ${proof.violation}\n`);
    const run = spawnSync("make", ["--no-print-directory", ...target], { stdio: "inherit", env });
    record.exitStatus = run.status;
    const scopeRecord = proof.scope ? readJson("reports/mutation/scope.json") : undefined;
    Object.assign(record, attribute(proof, run.status, readJson(reportFile), scopeRecord));
  } catch (error) {
    record.outcome = "not proved";
    record.error = error.message;
  } finally {
    restore();
  }
  if (status() !== "") {
    console.error(`the tree did not survive the ${proof.gate} proof:\n${status()}`);
    process.exit(2);
  }
  return record;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requested = process.argv.slice(2);
  const selected =
    requested.length === 0 ? PROOFS : PROOFS.filter((p) => requested.includes(p.gate));
  refuseUnattributable(selected);
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const results = selected.map(prove);
  mkdirSync("reports", { recursive: true });
  writeFileSync(
    "reports/gate-proofs.json",
    `${JSON.stringify({ commit, finishedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  console.log("\n── Gate Proofs");
  for (const r of results) {
    const scopes = r.declared
      ? `; declared ${r.declared.join(", ")}; analyzed ${Array.isArray(r.analyzed) ? r.analyzed.join(", ") : r.analyzed}`
      : "";
    console.log(
      `   ${r.outcome === "red because of the Gate" ? "✔" : "✘"} ${r.gate} (${r.entryPoint}): ${r.outcome}; failing Gate ${String(r.failingGate)}${scopes}`,
    );
  }
  process.exit(results.every((r) => r.outcome === "red because of the Gate") ? 0 : 1);
}
