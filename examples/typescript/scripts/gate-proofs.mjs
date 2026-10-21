// Runs the Gate Proof for every Gate, one at a time.
//
// A Gate Proof introduces the smallest violation the Gate exists to catch,
// runs the Gate command the Entry Point invokes, confirms it goes red because
// of that Gate, then restores the tree. It is a one-off proof that the Gate
// works, not part of either Entry Point.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { report } from "./lib.mjs";

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const MAKE = process.platform === "win32" ? "make.exe" : "make";

function run(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    timeout: 30 * 60 * 1000,
  });
}

function outputOf(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function tempFile(path, content) {
  writeFileSync(path, content);
  return () => rmSync(path, { force: true });
}

function patch(path, transform) {
  const original = readFileSync(path, "utf8");
  writeFileSync(path, transform(original));
  return () => writeFileSync(path, original);
}

function patchPair(entries) {
  const originals = entries.map(([path]) => [path, readFileSync(path, "utf8")]);
  for (const [path, content] of entries) writeFileSync(path, content);
  return () => {
    for (const [path, content] of originals) writeFileSync(path, content);
  };
}

const proofs = [
  {
    gate: "Format",
    description: "misindented a source file",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/format-proof.ts", "export const formatProof = { a:1 };\n"),
  },
  {
    gate: "Lint",
    description: "added an unused variable",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/lint-proof.ts", "const unusedProof = 1;\n"),
  },
  {
    gate: "Types",
    description: "assigned a string to a number",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/types-proof.ts", 'export const wrongType: number = "text";\n'),
  },
  {
    gate: "Unit tests",
    description: "inverted the already-returned condition",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      patch("src/lending/domain/loan.ts", (source) =>
        source.replace("if (loan.returnedAt !== null) {", "if (loan.returnedAt === null) {"),
      ),
  },
  {
    gate: "Integration tests",
    description: "mapped borrowed_at from the wrong column",
    command: [MAKE, ["check"]],
    violation: () =>
      patch("src/lending/adapters/postgres-loan-repository.ts", (source) =>
        source.replace("borrowedAt: row.borrowed_at,", "borrowedAt: row.due_at,"),
      ),
  },
  {
    gate: "E2E tests",
    description: "renamed the route that creates a book",
    command: [MAKE, ["check"]],
    violation: () => {
      const restore = patch("src/http/server.ts", (source) =>
        source.replace("pattern: /^\\/books$/,", "pattern: /^\\/catalogue$/,"),
      );
      // The proof builds the broken tree into dist/; rebuild on cleanup so a
      // later e2e run does not see the violation.
      return () => {
        restore();
        const build = run(NPM, ["run", "build"]);
        if (build.status !== 0) console.error(outputOf(build));
      };
    },
  },
  {
    gate: "Mutation",
    description: "deleted the assertions of the core loan unit test",
    command: [MAKE, ["check"]],
    violation: () =>
      patch(
        "src/lending/domain/loan.test.ts",
        () =>
          'import { describe, expect, it } from "vitest";\n\n' +
          'describe("loan", () => {\n' +
          '  it("still runs", () => {\n' +
          "    expect(true).toBe(true);\n" +
          "  });\n" +
          "});\n",
      ),
  },
  {
    gate: "Context boundaries",
    description: "imported a Catalog domain module from Lending",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      tempFile(
        "src/lending/domain/boundary-proof.ts",
        'import { createBook } from "../../catalog/domain/book.js";\n' +
          "export const boundaryProof = createBook;\n",
      ),
  },
  {
    gate: "Dependency rule",
    description: "imported pg in the Catalog domain",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      tempFile(
        "src/catalog/domain/dependency-proof.ts",
        'import { Pool } from "pg";\n' + "export const dependencyProof = Pool;\n",
      ),
  },
  {
    gate: "Static metrics",
    description: "wrote a function with eleven branches",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      tempFile(
        "src/metrics-proof.ts",
        "export function metricsProof(n: number): number {\n" +
          "  let total = 0;\n" +
          Array.from({ length: 11 }, (_, i) => `  if (n === ${i + 1}) total += 1;`).join("\n") +
          "\n  return total;\n}\n",
      ),
  },
  {
    gate: "Dependency vulnerabilities",
    description: "locked lodash@4.17.20 (high advisory)",
    command: [MAKE, ["check"]],
    violation: () => {
      let packageJson;
      try {
        packageJson = JSON.parse(readFileSync("package.json", "utf8"));
      } catch {
        throw new Error("package.json is not valid JSON");
      }
      packageJson.dependencies.lodash = "4.17.20";
      const originalLock = readFileSync("package-lock.json", "utf8");
      const cleanupPackage = patchPair([
        ["package.json", `${JSON.stringify(packageJson, null, 2)}\n`],
        ["package-lock.json", originalLock],
      ]);
      const install = run(NPM, ["install", "--package-lock-only", "--no-audit", "--no-fund"]);
      if (install.status !== 0) {
        console.error(outputOf(install));
      }
      return cleanupPackage;
    },
  },
  {
    gate: "Secrets",
    description: "added a well-formed fake cloud access key",
    command: [MAKE, ["check-fast"]],
    violation: () => {
      // Assembled at runtime so this proof file contains no key-shaped text.
      const fakeCloudKey = ["AKIA", "3Q7Z2XK9WQ4MLP7V"].join("");
      return tempFile("src/secrets-proof.ts", `export const accessKey = "${fakeCloudKey}";\n`);
    },
  },
  {
    gate: "Avoided terms",
    description: "named an identifier inventory",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/avoided-proof.ts", "export const inventory = 1;\n"),
  },
  {
    gate: "Guide pointers",
    description: "linked a Guide to a missing file",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      patch("docs/guides/architecture.md", (source) => `${source}\n[broken](missing-file.md)\n`),
  },
];

const only = process.argv
  .find((argument) => argument.startsWith("--gate="))
  ?.slice("--gate=".length);
const selected = only === undefined ? proofs : proofs.filter((proof) => proof.gate === only);
if (selected.length === 0) {
  report("Gate proofs", [`no Gate named "${only}"`]);
}

const results = [];
for (const proof of selected) {
  let cleanup = () => {};
  let result;
  try {
    cleanup = proof.violation() ?? (() => {});
    result = run(...proof.command);
  } finally {
    cleanup();
  }
  const output = outputOf(result);
  const wentRed = result.status !== 0 && output.includes(`✘ ${proof.gate}`);
  results.push({
    gate: proof.gate,
    description: proof.description,
    command: [proof.command[0], ...proof.command[1]].join(" "),
    wentRed,
    exitCode: result.status,
    output,
  });
  console.log(`${wentRed ? "✔" : "✘"} Gate Proof: ${proof.gate}`);
  if (!wentRed) console.log(output.split("\n").slice(-20).join("\n"));
}

mkdirSync("reports", { recursive: true });
writeFileSync(
  "reports/gate-proofs.json",
  `${JSON.stringify(
    results.map((result) => ({
      ...result,
      output: result.output.split("\n").slice(-20).join("\n"),
    })),
    null,
    2,
  )}\n`,
);

report(
  "Gate proofs",
  results.filter((result) => !result.wentRed).map((result) => `${result.gate} did not go red`),
);
