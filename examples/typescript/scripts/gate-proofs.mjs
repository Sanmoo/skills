// Runs the Gate Proof for every Gate, one at a time.
//
// A Gate Proof introduces the smallest violation the Gate exists to catch, runs
// the Entry Point of that Gate's tier with only that violation present, confirms
// it went red because of that Gate, then restores the tree. It is a one-off
// proof that the Gate works, not part of either Entry Point.
//
// The Entry Point is the same command in every proof of the same tier, and that
// is deliberate: what differs between two runs is the tree, which carries
// exactly one violation each time. Attribution comes from the Entry Point's own
// output, where every Gate names itself, because it stops at the first Gate that
// fails - so a correct proof leaves exactly one Gate marked red, and it is the
// Gate under proof (see `wentRed` below). Several violations in one tree would
// leave several Gates red, the first failure would hide the rest, and no run
// could say which Gate caught which violation.
//
// The full tier is not free - it runs a container, the mutation Gate and the
// advisory database - and a complete run pays that cost once per full-tier
// proof. That is why the script is in neither Entry Point, and why `--gate=`
// exists to iterate on one proof without the rest.
//
// The preconditions attribution rests on are checked rather than assumed: the
// proof list must give each Gate one label and the Entry Point of its tier, the
// tree must be clean before the run, and each injection must have left a change
// behind. Any of those failing is a setup error, not evidence.
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
    tier: "fast",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/format-proof.ts", "export const formatProof = { a:1 };\n"),
  },
  {
    gate: "Lint",
    description: "added an unused variable",
    tier: "fast",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/lint-proof.ts", "const unusedProof = 1;\n"),
  },
  {
    gate: "Types",
    description: "assigned a string to a number",
    tier: "fast",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/types-proof.ts", 'export const wrongType: number = "text";\n'),
  },
  {
    gate: "Unit tests",
    description: "inverted the already-returned condition",
    tier: "fast",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      patch("src/lending/domain/loan.ts", (source) =>
        source.replace("if (loan.returnedAt !== null) {", "if (loan.returnedAt === null) {"),
      ),
  },
  {
    gate: "Integration tests",
    description: "mapped borrowed_at from the wrong column",
    tier: "full",
    command: [MAKE, ["check"]],
    violation: () =>
      patch("src/lending/adapters/postgres-loan-repository.ts", (source) =>
        source.replace("borrowedAt: row.borrowed_at,", "borrowedAt: row.due_at,"),
      ),
  },
  {
    gate: "Mutation",
    description: "deleted the assertions of the core loan unit test",
    tier: "full",
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
    tier: "fast",
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
    tier: "fast",
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
    tier: "fast",
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
    tier: "full",
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
    tier: "fast",
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
    tier: "fast",
    command: [MAKE, ["check-fast"]],
    violation: () => tempFile("src/avoided-proof.ts", "export const inventory = 1;\n"),
  },
  {
    gate: "Guide pointers",
    description: "linked a Guide to a missing file",
    tier: "fast",
    command: [MAKE, ["check-fast"]],
    violation: () =>
      patch("docs/guides/architecture.md", (source) => `${source}\n[broken](missing-file.md)\n`),
  },
];

const ENTRY_POINTS = { fast: "check-fast", full: "check" };

// A proof that ran one Gate target would show the Gate works, not that the Entry
// Point catches it, and that is the whole point. A proof whose command is not the
// Entry Point of its own tier would not measure the tier it claims. A duplicated
// label would make "this Gate went red" unattributable. Each is rejected up front.
function attributionProblems(proofList) {
  const problems = [];
  const labels = new Set();
  for (const proof of proofList) {
    if (labels.has(proof.gate)) {
      problems.push(
        `"${proof.gate}" labels more than one proof, so a red run could not say which one it proves`,
      );
    }
    labels.add(proof.gate);
    const [command, args = []] = proof.command;
    const expected = ENTRY_POINTS[proof.tier];
    if (command !== MAKE || args.length !== 1 || args[0] !== expected) {
      problems.push(
        `${proof.gate} is ${proof.tier}-tier, so its proof must run \`make ${expected}\` and nothing else`,
      );
    }
  }
  return problems;
}

// The report this script writes is its own output, so an uncommitted copy of it
// must not stop the next run; anything else in the tree would.
const OWN_OUTPUT = "reports/gate-proofs.json";

function changedPaths() {
  const status = run("git", ["status", "--porcelain"]);
  if (status.status !== 0) {
    throw new Error("the tree cannot be inspected with git status");
  }
  return status.stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "" && !line.includes(OWN_OUTPUT));
}

const problems = attributionProblems(proofs);
const alreadyDirty = changedPaths();
if (alreadyDirty.length > 0) {
  problems.push(
    "the tree is not clean, so a Gate could react to a change no proof made:",
    ...alreadyDirty.map((change) => `  ${change}`),
  );
}
if (problems.length > 0) {
  report("Gate proofs", problems);
}

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
  let treeChanges = [];
  try {
    cleanup = proof.violation() ?? (() => {});
    // What the tree looked like while the Entry Point ran is the evidence that
    // this proof's violation was the only change in it.
    treeChanges = changedPaths();
    if (treeChanges.length === 0) {
      throw new Error("the violation left the tree unchanged, so nothing was there to catch");
    }
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
      tier: proof.tier,
      description: proof.description,
      command: [proof.command[0], ...proof.command[1]].join(" "),
      treeChanges,
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
    tier: proof.tier,
    description: proof.description,
    command: [proof.command[0], ...proof.command[1]].join(" "),
    treeChanges,
    wentRed,
    redGates,
    exitCode: result.status,
    output,
  });
  console.log(`${wentRed ? "✔" : "✘"} Gate Proof: ${proof.gate}`);
  if (!wentRed) console.log(output.split("\n").slice(-20).join("\n"));
}

// The committed report only ever holds a complete run: `--gate=` is for
// iterating on one proof, and writing it over the evidence of the others would
// lose them.
if (only === undefined) {
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
} else {
  console.log(`  one proof ran; reports/gate-proofs.json is left as the last complete run`);
}

report(
  "Gate proofs",
  results.filter((result) => !result.wentRed).map((result) => `${result.gate} did not go red`),
);
