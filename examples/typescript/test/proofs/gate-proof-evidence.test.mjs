// Checks at the Gate Proof runner's executable boundary.
//
// The runner is proof machinery, not part of either Entry Point, so these
// checks do not run with normal validation: the `gate-proofs` workflow runs them
// before it runs the proofs. They drive the runner with a stand-in Entry Point
// and a stand-in mutation tool, so what they observe is its evidence
// bookkeeping - the requested and analyzed scope it records, the red result it
// accepts, and the tree it restores - rather than what the pinned tools measure.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import {
  baseEnvironment,
  newSandbox,
  stubCommand,
  writeTree,
} from "../support/harness-sandbox.mjs";

const PROJECT = dirname(dirname(import.meta.dirname));
const PROOF_RUNNER = join(PROJECT, "scripts", "gate-proofs.mjs");
const LOAN = "src/lending/domain/loan.ts";
const LOAN_TEST = "src/lending/domain/loan.test.ts";
const BOOK = "src/catalog/domain/book.ts";
const ADAPTER = "src/lending/adapters/postgres-loan-repository.ts";

const DECLARED = {
  selection: "explicit",
  requestedFiles: [LOAN],
  analyzedFiles: [LOAN],
  analyzedFilesUnavailable: null,
  analysisCompleted: true,
};

// The stand-in Entry Point always fails on Mutation and writes whatever scope
// record the check puts in front of it. A complete run needs every proof's
// violation to apply, so its sandbox also carries the files those proofs patch
// and a stand-in for the build and dependency commands.
function proofSandbox(t, { complete = false } = {}) {
  const { root, stubs, git } = newSandbox(t);
  writeFileSync(join(root, "Makefile"), readFileSync(join(PROJECT, "Makefile")));
  const files = { ".gitignore": "reports/\n", [LOAN_TEST]: "// unit test\n" };
  if (complete) {
    Object.assign(files, {
      [LOAN]:
        "export function returnLoan(loan) {\n  if (loan.returnedAt !== null) {\n    return loan;\n  }\n}\n",
      [ADAPTER]: "const row = {};\n\nexport const loan = {\n  borrowedAt: row.borrowed_at,\n};\n",
      "src/http/server.ts": "export const routes = [{ pattern: /^\\/books$/, run: () => {} }];\n",
      "docs/guides/architecture.md": "# Architecture\n",
      "package.json": '{"dependencies":{}}\n',
      "package-lock.json": "{}\n",
    });
    stubCommand(stubs, "npm");
  }
  writeTree(root, files);
  git("add", "-A");
  git("commit", "-m", "base");
  const scope = join(stubs, "scope.json");
  writeFileSync(
    join(stubs, "make"),
    `#!/bin/sh
mkdir -p reports/mutation
if [ -f "${scope}" ]; then cp "${scope}" reports/mutation/scope.json; fi
echo "✘ Mutation"
i=0
while [ $i -lt 30 ]; do echo "  mutant $i survived"; i=$((i + 1)); done
exit 1
`,
  );
  chmodSync(join(stubs, "make"), 0o755);
  const run = (arguments_ = ["--gate=Mutation"]) => {
    const result = spawnSync("node", [PROOF_RUNNER, ...arguments_], {
      cwd: root,
      encoding: "utf8",
      env: baseEnvironment([stubs]),
    });
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
    };
  };
  return {
    root,
    git,
    run,
    recordScope: (record) => writeFileSync(scope, JSON.stringify(record)),
    forgetScope: () => rmSync(scope, { force: true }),
  };
}

describe("Gate Proof scope evidence", () => {
  it("accepts the proof when the Gate analyzed the declared input", (t) => {
    const proofs = proofSandbox(t);
    proofs.recordScope(DECLARED);

    const result = proofs.run();

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /✔ Gate Proof: Mutation/);
    assert.match(result.output, /scope requested: src\/lending\/domain\/loan\.ts/);
    assert.match(result.output, /scope analyzed: src\/lending\/domain\/loan\.ts/);
    assert.equal(proofs.git("status", "--porcelain"), "", "the tree must be restored");
  });

  it("rejects a red Gate that analyzed something else", (t) => {
    const proofs = proofSandbox(t);
    proofs.recordScope({ ...DECLARED, analyzedFiles: [BOOK] });

    const result = proofs.run();

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /the declared input "src\/lending\/domain\/loan\.ts" was not analyzed/,
    );
  });

  it("rejects a red Gate that also analyzed files the proof did not declare", (t) => {
    // A wider analysis would let healthy unrelated code dilute the intended
    // failure, so the proof's scope has to be exactly what it declared.
    const proofs = proofSandbox(t);
    proofs.recordScope({ ...DECLARED, analyzedFiles: [LOAN, BOOK] });

    const result = proofs.run();

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /"src\/catalog\/domain\/book\.ts" was analyzed although the proof declared no such input/,
    );
  });

  it("rejects a red Gate whose analysis never completed", (t) => {
    // The files were selected, but the tool failed: a red result then says
    // nothing about the tests noticing a wrong change.
    const proofs = proofSandbox(t);
    proofs.recordScope({ ...DECLARED, analysisCompleted: false });

    const result = proofs.run();

    assert.notEqual(result.status, 0);
    assert.match(result.output, /analysis did not complete, so its red result is not a score/);
  });

  it("rejects a proof with no scope record at all", (t) => {
    const proofs = proofSandbox(t);
    proofs.forgetScope();

    const result = proofs.run();

    assert.notEqual(result.status, 0);
    assert.match(result.output, /no scope record at/);
  });

  it("rejects a red Gate that refused the declared scope", (t) => {
    const proofs = proofSandbox(t);
    proofs.recordScope({
      selection: "rejected",
      requestedFiles: [LOAN],
      analyzedFiles: null,
      analyzedFilesUnavailable:
        'MUTATION_SCOPE names "src/lending/domain/loan.ts", which does not exist',
      analysisCompleted: false,
    });

    const result = proofs.run();

    assert.notEqual(result.status, 0);
    assert.match(result.output, /selected by "rejected" instead of the declared scope/);
    assert.match(result.output, /which does not exist/);
  });

  it("leaves the complete run's report in place for a single-Gate iteration", (t) => {
    const proofs = proofSandbox(t);
    proofs.recordScope(DECLARED);
    mkdirSync(join(proofs.root, "reports"), { recursive: true });
    const report = join(proofs.root, "reports", "gate-proofs.json");
    writeFileSync(report, '{"complete":true}\n');

    const result = proofs.run();

    assert.equal(result.status, 0, result.output);
    assert.equal(readFileSync(report, "utf8"), '{"complete":true}\n');
  });

  it("keeps both scopes in the persisted evidence of a complete run", (t) => {
    // The stand-in Entry Point fails on Mutation for every proof, so the run
    // reports failures; the report is still written, which is what a shortened
    // log must not be able to erase.
    const proofs = proofSandbox(t, { complete: true });
    proofs.recordScope(DECLARED);

    const result = proofs.run([]);

    const report = JSON.parse(
      readFileSync(join(proofs.root, "reports", "gate-proofs.json"), "utf8"),
    );
    assert.ok(report.length > 1, "a complete run records every proof");
    const mutation = report.find((record) => record.gate === "Mutation");
    assert.deepEqual(mutation.scope, {
      requested: [LOAN],
      selection: "explicit",
      analyzed: [LOAN],
      analysisCompleted: true,
      unavailable: null,
      problems: [],
    });
    assert.equal(mutation.wentRed, true);
    assert.equal(mutation.command, "make check");
    // The violation is the weakened unit test and nothing else: no source
    // marker stands in for the scope declaration.
    assert.deepEqual(mutation.treeChanges, [` M ${LOAN_TEST}`]);
    // The persisted output is the shortened tail, so the scope above has to be
    // evidence of its own rather than something read out of the log.
    assert.equal(mutation.output.split("\n").length, 20);
    // A later proof must not inherit the declared scope.
    const later = report.slice(report.indexOf(mutation) + 1);
    assert.ok(later.length > 0, "proofs after Mutation ran");
    for (const record of later) {
      assert.equal(record.scope.requested, null, `${record.gate} inherited a scope`);
      assert.equal(record.scope.unavailable, "no scope was declared");
    }
    assert.equal(proofs.git("status", "--porcelain"), "", "the tree must be restored");
    assert.match(result.output, /Gate proofs/);
  });
});
