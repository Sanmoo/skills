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
    description: "locked tinypool@2.1.1 (critical advisory)",
    command: [MAKE, ["check"]],
    violation: () => {
      let packageJson;
      try {
        packageJson = JSON.parse(readFileSync("package.json", "utf8"));
      } catch {
        throw new Error("package.json is not valid JSON");
      }
      packageJson.dependencies.tinypool = "2.1.1";
      const originalPackage = readFileSync("package.json", "utf8");
      const originalLock = readFileSync("package-lock.json", "utf8");
      // The vulnerable version must be on disk while the Entry Point runs; the
      // cleanup at the end of the proof restores both files.
      writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
      const install = run(NPM, ["install", "--package-lock-only", "--no-audit", "--no-fund"]);
      if (install.status !== 0) {
        console.error(outputOf(install));
      }
      return () => {
        writeFileSync("package.json", originalPackage);
        writeFileSync("package-lock.json", originalLock);
      };
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
  let setupError;
  try {
    cleanup = proof.violation() ?? (() => {});
    result = run(...proof.command);
  } catch (error) {
    setupError = error;
  } finally {
    try {
      cleanup();
    } catch (error) {
      setupError ??= error;
    }
  }
  if (setupError !== undefined || result === undefined) {
    const message = setupError instanceof Error ? setupError.message : String(setupError);
    results.push({
      gate: proof.gate,
      description: proof.description,
      command: [proof.command[0], ...proof.command[1]].join(" "),
      wentRed: false,
      redGates: [],
      exitCode: null,
      output: message,
    });
    console.log(`✘ Gate Proof: ${proof.gate}\n${message}`);
    continue;
  }
  const output = outputOf(result);
  const redGates = [...output.matchAll(/^✘ (.+)$/gm)].map((match) => match[1].trim());
  const wentRed = result.status !== 0 && redGates.length === 1 && redGates[0] === proof.gate;
  results.push({
    gate: proof.gate,
    description: proof.description,
    command: [proof.command[0], ...proof.command[1]].join(" "),
    wentRed,
    redGates,
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
