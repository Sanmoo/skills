// Runs the Gate Proof for every Gate, one at a time.
//
// A Gate Proof introduces the smallest violation the Gate exists to catch, runs
// the Entry Point of that Gate's tier with only that violation present, confirms
// it went red because of that Gate, then restores the tree. It is a one-off
// proof that the Gate works, not part of either Entry Point.
//
// The Entry Point is the same command in every proof of the same tier, and that
// is deliberate: what differs between two runs is the tree, which carries
// exactly one violation each time. A Gate that analyzes the changed set needs
// the violation's input inside that set, and the proof's branch may change none
// of it, so such a proof declares the smallest eligible scope it needs. The
// declaration is setup, not a second violation: the tree still carries only the
// deliberate fault. It replaces the Gate's changed-set selection for that one
// execution through the stack's own transport (here `MUTATION_SCOPE`), and the
// record keeps both the requested files and the files the Gate actually
// analyzed, read from the Gate's own scope record rather than from output that
// may be truncated below. Attribution comes from the Entry Point's own output,
// where every Gate names itself, because it stops at the first Gate that fails -
// so a correct proof leaves exactly one Gate marked red, and it is the Gate
// under proof (see `wentRed` below). Several violations in one tree would
// leave several Gates red, the first failure would hide the rest, and no run
// could say which Gate caught which violation.
//
// The full tier is not free - it runs a container, the mutation Gate and the
// advisory database - and a complete run pays that cost once per full-tier
// proof. That is why the script is in neither Entry Point, and why `--gate=`
// exists to iterate on one proof without the rest.
//
// The preconditions attribution rests on are checked rather than assumed: every
// Gate an Entry Point runs must have exactly one proof with one label, the tree
// must be clean before each proof and again after it, and each injection must
// have left a change behind. Any of those failing is a setup error, not evidence.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { outputOf, report, run } from "./lib.mjs";
import {
  MUTATION_SCOPE_ENV,
  MUTATION_SCOPE_RECORD,
  SELECTION,
  readScopeRecord,
} from "./mutation-scope.mjs";

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const MAKE = process.platform === "win32" ? "make.exe" : "make";
// The Mutation Gate's scope record and the transport that carries a declared
// scope into one run are this stack's choice; a contract only asks that the
// proof reaches its inputs and that the evidence names them. Both live in
// scripts/mutation-scope.mjs, shared with the wrapper that writes them.

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
    target: "format",
    description: "misindented a source file",
    violation: () => tempFile("src/format-proof.ts", "export const formatProof = { a:1 };\n"),
  },
  {
    gate: "Lint",
    target: "lint",
    description: "added an unused variable",
    violation: () => tempFile("src/lint-proof.ts", "const unusedProof = 1;\n"),
  },
  {
    gate: "Types",
    target: "types",
    description: "assigned a string to a number",
    violation: () => tempFile("src/types-proof.ts", 'export const wrongType: number = "text";\n'),
  },
  {
    gate: "Unit tests",
    target: "unit",
    description: "inverted the already-returned condition",
    violation: () =>
      patch("src/lending/domain/loan.ts", (source) =>
        source.replace("if (loan.returnedAt !== null) {", "if (loan.returnedAt === null) {"),
      ),
  },
  {
    gate: "Integration tests",
    target: "integration",
    description: "mapped borrowed_at from the wrong column",
    violation: () =>
      patch("src/lending/adapters/postgres-loan-repository.ts", (source) =>
        source.replace("borrowedAt: row.borrowed_at,", "borrowedAt: row.due_at,"),
      ),
  },
  {
    gate: "E2E tests",
    target: "e2e",
    description: "renamed the route that registers a book",
    violation: () => {
      const restore = patch("src/http/server.ts", (source) =>
        source.replace("pattern: /^\\/books$/,", "pattern: /^\\/catalogue$/,"),
      );
      // The proof builds the broken tree into dist/; rebuild on cleanup so a
      // later e2e run does not see the violation.
      return () => {
        restore();
        const build = run(NPM, ["run", "build"]);
        if (build.status !== 0) {
          throw new Error(`rebuilding dist after the E2E proof failed: ${outputOf(build)}`);
        }
      };
    },
  },
  {
    gate: "Mutation",
    target: "mutation",
    description: "deleted the assertions of the core loan unit test",
    // This Gate mutates the changed set, and a proof branch may change none of
    // it, so the proof declares the smallest eligible input instead of marking
    // a source file to look changed. The declaration cannot dilute the proof
    // either: unrelated changed files are not analyzed. An empty, missing, or
    // ineligible entry fails the run as a setup error, never as this violation.
    scope: ["src/lending/domain/loan.ts"],
    violation: () =>
      patch(
        "src/lending/domain/loan.test.ts",
        () =>
          'import { describe, expect, it } from "vitest";\n' +
          'import { borrowBook } from "./loan.js";\n\n' +
          'describe("loan", () => {\n' +
          '  it("still runs", () => {\n' +
          '    expect(typeof borrowBook).toBe("function");\n' +
          "  });\n" +
          "});\n",
      ),
  },
  {
    gate: "Context boundaries",
    target: "boundaries",
    description: "imported a Catalog domain module from Lending",
    violation: () =>
      tempFile(
        "src/lending/domain/boundary-proof.ts",
        'import { createBook } from "../../catalog/domain/book.js";\n' +
          "export const boundaryProof = createBook;\n",
      ),
  },
  {
    gate: "Dependency rule",
    target: "dependency-rule",
    description: "imported pg in the Catalog domain",
    violation: () =>
      tempFile(
        "src/catalog/domain/dependency-proof.ts",
        'import { Pool } from "pg";\n' + "export const dependencyProof = Pool;\n",
      ),
  },
  {
    gate: "Static metrics",
    target: "metrics",
    description: "wrote a function with eleven branches",
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
    target: "vulnerabilities",
    description: "locked tinypool@2.1.1 (critical advisory)",
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
    target: "secrets",
    description: "added a well-formed fake cloud access key",
    violation: () => {
      // Assembled at runtime so this proof file contains no key-shaped text.
      const fakeCloudKey = ["AKIA", "3Q7Z2XK9WQ4MLP7V"].join("");
      return tempFile("src/secrets-proof.ts", `export const accessKey = "${fakeCloudKey}";\n`);
    },
  },
  {
    gate: "Avoided terms",
    target: "avoided-terms",
    description: "named an identifier inventory",
    violation: () => tempFile("src/avoided-proof.ts", "export const inventory = 1;\n"),
  },
  {
    gate: "Guide pointers",
    target: "guide-pointers",
    description: "linked a Guide to a missing file",
    violation: () =>
      patch("docs/guides/architecture.md", (source) => `${source}\n[broken](missing-file.md)\n`),
  },
];

// The Makefile is the authority on which Gates each Entry Point runs, so the
// script reads it rather than keeping a copy that could drift from it. A Gate
// added to an Entry Point and left unproven is then a setup error, and a proof
// cannot claim a tier the Makefile does not give it.
function entryPointTargets() {
  const makefile = readFileSync("Makefile", "utf8");
  function prerequisites(name) {
    const match = new RegExp(`^${name}\\s*:([^\\n]*)`, "m").exec(makefile);
    if (match === null) {
      throw new Error(`the Makefile has no "${name}" Entry Point`);
    }
    return match[1].replace(/#.*$/, "").split(/\s+/).filter(Boolean);
  }
  const fast = prerequisites("check-fast");
  const full = prerequisites("check").filter(
    (target) => target !== "check-fast" && !fast.includes(target),
  );
  return { fast, full };
}

const ENTRY_POINTS = entryPointTargets();

// The Entry Point whose prerequisites include this Gate target, or undefined
// when neither Entry Point runs it. Its name is also the tier's name.
function entryPointOf(target) {
  if (ENTRY_POINTS.fast.includes(target)) return "check-fast";
  if (ENTRY_POINTS.full.includes(target)) return "check";
  return undefined;
}

// The fields every record shares; the caller adds what only a finished run can
// know. `treeChanges` is null when the violation never got applied, so an
// unmeasured tree cannot be read as a clean one.
function recordOf(proof, tree) {
  const entryPoint = entryPointOf(proof.target);
  return {
    gate: proof.gate,
    tier: entryPoint === "check" ? "full" : "fast",
    description: proof.description,
    command: `${MAKE} ${entryPoint}`,
    treeChanges: tree,
  };
}

// A proof that declared a scope has shown something only if the Gate reports
// that selection and analyzed the files it named. A red Gate over other inputs,
// over none, or over a rejected declaration does not say the intended violation
// was measured, so it cannot count as a Gate Proof.
function scopeProblems(requested, recorded) {
  if (recorded.record === null) return [recorded.reason];
  const problems = [];
  if (recorded.record.selection !== SELECTION.explicit) {
    problems.push(
      `the Mutation Gate selected by "${recorded.record.selection}" instead of the declared scope`,
    );
  }
  const analyzed = recorded.record.analyzedFiles;
  if (analyzed === null) {
    problems.push(recorded.record.unavailable ?? "the Mutation Gate recorded no analyzed files");
    return problems;
  }
  for (const file of requested) {
    if (!analyzed.includes(file)) {
      problems.push(`the declared input "${file}" was not analyzed`);
    }
  }
  return problems;
}

// The scope fields every record carries: what the proof asked for, what the
// Gate said it selected, and what it analyzed. Requested and effective scope
// live here rather than in the output, so a shortened log cannot erase them.
function scopeOf(proof, recorded, problems = []) {
  const record = recorded?.record ?? null;
  return {
    requested: proof.scope ?? null,
    selection: record?.selection ?? null,
    analyzed: record?.analyzedFiles ?? null,
    // A record that holds `null` here has answered the question: the analysis
    // produced nothing to mark unavailable. Only a missing record falls through
    // to why there is no scope to show.
    unavailable:
      record !== null
        ? (record.unavailable ?? null)
        : (recorded?.reason ??
          (proof.scope === undefined ? "no scope was declared" : "the Entry Point did not run")),
    problems,
  };
}

// A proof that ran one Gate target would show the Gate works, not that the Entry
// Point catches it, and that is the whole point. A duplicated label would make
// "this Gate went red" unattributable, and a Gate an Entry Point runs without a
// proof would go unproven in silence. Each is rejected up front.
function attributionProblems(proofList) {
  const problems = [];
  const labels = new Set();
  const targets = new Set();
  for (const proof of proofList) {
    if (labels.has(proof.gate)) {
      problems.push(
        `"${proof.gate}" labels more than one proof, so a red run could not say which one it proves`,
      );
    }
    labels.add(proof.gate);
    if (targets.has(proof.target)) {
      problems.push(`Gate target "${proof.target}" is proven more than once`);
    }
    targets.add(proof.target);
    if (entryPointOf(proof.target) === undefined) {
      problems.push(`"${proof.gate}" proves "${proof.target}", which neither Entry Point runs`);
    }
    if (proof.scope !== undefined && (!Array.isArray(proof.scope) || proof.scope.length === 0)) {
      problems.push(`"${proof.gate}" declares an empty scope, so its proof would exercise nothing`);
    }
  }
  for (const target of [...ENTRY_POINTS.fast, ...ENTRY_POINTS.full]) {
    if (!targets.has(target)) {
      problems.push(`Gate target "${target}" runs in an Entry Point but has no proof`);
    }
  }
  return problems;
}

// Porcelain lines for what is changed in the project right now, status codes
// included, so the report shows what a Gate could have reacted to.
function treeChanges() {
  const status = run("git", ["status", "--porcelain", "--", "./"]);
  if (status.status !== 0) {
    throw new Error("the tree cannot be inspected with git status");
  }
  return status.stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "");
}

const problems = attributionProblems(proofs);
const alreadyDirty = treeChanges();
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
  let treeChangesWhileRunning = null;
  try {
    // An earlier run's scope record must not be read as this run's evidence.
    rmSync(MUTATION_SCOPE_RECORD, { force: true });
    cleanup = proof.violation() ?? (() => {});
    // What the violation left in the tree, recorded before the Entry Point runs
    // so the report shows what a Gate could have reacted to.
    treeChangesWhileRunning = treeChanges();
    if (treeChangesWhileRunning.length === 0) {
      throw new Error("the violation left the tree unchanged, so nothing was there to catch");
    }
    // A declared scope reaches the Gate through the environment of this one
    // execution, so it cannot apply to an earlier or later run and needs no
    // state on disk that a failure could leave behind.
    result = run(MAKE, [entryPointOf(proof.target)], {
      timeout: 30 * 60 * 1000,
      env: proof.scope === undefined ? {} : { [MUTATION_SCOPE_ENV]: proof.scope.join(",") },
    });
  } catch (error) {
    setupError = error;
  } finally {
    try {
      cleanup();
    } catch (error) {
      setupError ??= error;
    }
  }
  // The scope record is only read for a proof that declared one: an unscoped
  // proof says nothing about selection, and the Mutation Gate's own record from
  // the same run would read as if it had.
  const recordedScope = proof.scope === undefined ? undefined : readScopeRecord();
  // A violation that is still in the tree would ride along into the next proof
  // and be attributed to it, so the run stops here instead of recording a proof
  // that could not say what its red Gate reacted to.
  const leftBehind = treeChanges();
  if (leftBehind.length > 0) {
    report("Gate proofs", [
      `${proof.gate} did not leave the tree as it found it, so no later proof could be attributed:`,
      ...leftBehind.map((change) => `  ${change}`),
    ]);
  }
  if (setupError !== undefined || result === undefined) {
    const message = setupError instanceof Error ? setupError.message : String(setupError);
    results.push({
      ...recordOf(proof, treeChangesWhileRunning),
      scope: scopeOf(proof, undefined),
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
  const foundScopeProblems =
    proof.scope === undefined ? [] : scopeProblems(proof.scope, recordedScope);
  const wentRed =
    result.status !== 0 &&
    redGates.length === 1 &&
    redGates[0] === proof.gate &&
    foundScopeProblems.length === 0;
  results.push({
    ...recordOf(proof, treeChangesWhileRunning),
    scope: scopeOf(proof, recordedScope, foundScopeProblems),
    wentRed,
    redGates,
    exitCode: result.status,
    output,
  });
  console.log(`${wentRed ? "✔" : "✘"} Gate Proof: ${proof.gate}`);
  if (proof.scope !== undefined) {
    console.log(`  scope requested: ${proof.scope.join(", ")}`);
    console.log(
      `  scope analyzed: ${(recordedScope.record?.analyzedFiles ?? []).join(", ") || "not recorded"}`,
    );
  }
  if (!wentRed) {
    console.log(foundScopeProblems.map((problem) => `  ${problem}`).join("\n"));
    console.log(output.split("\n").slice(-20).join("\n"));
  }
}

// The report only ever holds a complete run: `--gate=` is for iterating on one
// proof, and writing it over the evidence of the others would lose them.
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
  results
    .filter((result) => !result.wentRed)
    .flatMap((result) => [
      `${result.gate} did not go red`,
      ...result.scope.problems.map((problem) => `  ${problem}`),
    ]),
);
