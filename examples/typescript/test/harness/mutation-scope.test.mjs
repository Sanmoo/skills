// Focused checks at the Mutation Gate's executable boundary.
//
// A Gate Proof shows that the Gate reaches its inputs through the Entry Point.
// These checks show the parts no single proof can: that ordinary changed-set
// discovery still selects what it should, that a declared proof scope replaces
// it for one execution, that both scopes are recorded, and that a wrong
// declaration fails loudly instead of widening or passing with nothing
// analyzed. Everything here drives the same executable the Entry Point drives,
// against controlled Git trees and a stand-in for the pinned mutation tool, so
// the checks observe selection, exit status and persisted evidence rather than
// any helper's name or layout.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { describe, it } from "node:test";

const PROJECT = dirname(dirname(import.meta.dirname));
const MUTATION = join(PROJECT, "scripts", "check-mutation.mjs");
const PROOF_RUNNER = join(PROJECT, "scripts", "gate-proofs.mjs");
const LOAN = "src/lending/domain/loan.ts";
const LOAN_TEST = "src/lending/domain/loan.test.ts";
const BOOK = "src/catalog/domain/book.ts";
const ADAPTER = "src/lending/adapters/postgres-loan-repository.ts";
const SCOPE_RECORD = "reports/mutation/scope.json";

// Git only tracks files, so a controlled tree is files plus commits.
function writeTree(root, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

function gitIn(root) {
  return (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

// A temporary directory pair: the controlled tree, and the stand-in tools that
// sit first on PATH. Both are removed when the check ends.
function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), "mutation-gate-"));
  const stubs = mkdtempSync(join(tmpdir(), "mutation-stubs-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(stubs, { recursive: true, force: true });
  });
  const git = gitIn(root);
  git("init", "--initial-branch=main");
  git("config", "user.email", "harness@example.invalid");
  git("config", "user.name", "Harness");
  return { root, stubs, git };
}

// Stands in for the pinned mutation tool: it records the scope it was asked to
// mutate and writes the report the wrapper reads, so the wrapper's own selection
// and thresholds run unchanged.
function stubMutationTool(stubs, defaultFiles) {
  const tool = join(stubs, "stryker-tool.mjs");
  const recorded = join(stubs, "stryker-args.json");
  writeFileSync(
    tool,
    `import { mkdirSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
writeFileSync(${JSON.stringify(recorded)}, JSON.stringify(args));
const at = args.indexOf("--mutate");
const files = at === -1 ? ${JSON.stringify(defaultFiles)} : args[at + 1].split(",");
const mutation = {
  files: Object.fromEntries(files.map((file) => [file, { mutants: [{ status: "Killed" }] }])),
};
mkdirSync("reports/mutation", { recursive: true });
writeFileSync("reports/mutation/mutation.json", JSON.stringify(mutation));
`,
  );
  mkdirSync(join(stubs, "bin"), { recursive: true });
  const command = join(stubs, "bin", "stryker");
  writeFileSync(command, `#!/bin/sh\nexec node ${JSON.stringify(tool)} "$@"\n`);
  chmodSync(command, 0o755);
  return { recorded };
}

// The environment a check passes to a child. A check must not inherit the
// scope or base of the proof that ran before it, or an ordinary run would look
// scoped; each check adds only what it is about.
function baseEnvironment(pathEntries) {
  const environment = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };
  delete environment.MUTATION_SCOPE;
  delete environment.MUTATION_BASE;
  environment.PATH = `${pathEntries.join(delimiter)}${delimiter}${process.env.PATH ?? ""}`;
  return environment;
}

// A controlled tree that has already committed a base and checked out the branch
// a proof would run on.
function mutationSandbox(t, { files, changed = {} }) {
  const { root, stubs, git } = sandbox(t);
  const tool = stubMutationTool(stubs, [LOAN, BOOK]);
  writeTree(root, { ".gitignore": "reports/\n", [LOAN_TEST]: "// unit test\n", ...files });
  git("add", "-A");
  git("commit", "-m", "base");
  git("checkout", "-b", "proof");
  if (Object.keys(changed).length > 0) {
    writeTree(root, changed);
    git("add", "-A");
    git("commit", "-m", "proof branch");
  }
  const run = (arguments_, environment = {}) => {
    rmSync(join(root, SCOPE_RECORD), { force: true });
    rmSync(tool.recorded, { force: true });
    const result = spawnSync("node", [MUTATION, ...arguments_], {
      cwd: root,
      encoding: "utf8",
      env: { ...baseEnvironment([join(stubs, "bin")]), ...environment },
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
    calledTool: () => existsSync(tool.recorded),
    toolArguments: () =>
      existsSync(tool.recorded) ? JSON.parse(readFileSync(tool.recorded, "utf8")) : undefined,
    scopeRecord: () =>
      existsSync(join(root, SCOPE_RECORD))
        ? JSON.parse(readFileSync(join(root, SCOPE_RECORD), "utf8"))
        : undefined,
  };
}

describe("ordinary Mutation selection", () => {
  it("selects an eligible file the branch changed", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [LOAN]: "// loan, changed on this branch\n" },
    });

    const result = gate.run([], { MUTATION_BASE: "main" });

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(gate.toolArguments(), ["run", "--mutate", LOAN]);
    assert.deepEqual(gate.scopeRecord(), {
      selection: "changed-set",
      requestedFiles: null,
      analyzedFiles: [LOAN],
      unavailable: null,
    });
  });

  it("keeps a branch with no eligible changed input a legitimate no-op", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [LOAN_TEST]: "// unit test, changed on this branch\n", "README.md": "docs\n" },
    });

    const result = gate.run([], { MUTATION_BASE: "main" });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /no mutable files changed relative to main/);
    assert.equal(gate.calledTool(), false, "nothing should be mutated");
    // An empty analyzed set here means the selection succeeded and found
    // nothing, which the record keeps apart from a selection that could not run.
    assert.deepEqual(gate.scopeRecord(), {
      selection: "changed-set",
      requestedFiles: null,
      analyzedFiles: [],
      unavailable: null,
    });
  });

  it("widens to the whole codebase when the comparison base is unresolvable", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [LOAN]: "// loan, changed on this branch\n" },
    });

    const result = gate.run([], { MUTATION_BASE: "trunk" });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /mutating the whole codebase/);
    assert.deepEqual(gate.toolArguments(), ["run"]);
    assert.equal(gate.scopeRecord().selection, "whole-codebase");
  });

  it("keeps the scheduled whole-codebase run whole-codebase", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [LOAN]: "// loan, changed on this branch\n" },
    });

    const result = gate.run(["--full"], { MUTATION_BASE: "main" });

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(gate.toolArguments(), ["run"]);
    assert.deepEqual(gate.scopeRecord().requestedFiles, null);
    assert.equal(gate.scopeRecord().selection, "whole-codebase");
  });

  it("refuses a declaration on the scheduled whole-codebase run", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [LOAN]: "// loan, changed on this branch\n" },
    });

    const result = gate.run(["--full"], { MUTATION_BASE: "main", MUTATION_SCOPE: LOAN });

    assert.notEqual(result.status, 0);
    assert.match(result.output, /cannot narrow the scheduled --full run/);
    assert.equal(gate.calledTool(), false);
    assert.deepEqual(gate.scopeRecord(), {
      selection: "rejected",
      requestedFiles: [LOAN],
      analyzedFiles: null,
      unavailable: "MUTATION_SCOPE cannot narrow the scheduled --full run",
    });
  });
});

describe("explicit proof scope", () => {
  it("replaces the changed set instead of adding to it", (t) => {
    // The branch changed an eligible file the proof does not declare; the
    // declared scope must be the only thing analyzed.
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [BOOK]: "// book, changed on this branch\n" },
    });

    const result = gate.run([], { MUTATION_BASE: "main", MUTATION_SCOPE: LOAN });

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(gate.toolArguments(), ["run", "--mutate", LOAN]);
    assert.match(result.output, /Mutation scope: explicit: src\/lending\/domain\/loan\.ts/);
  });

  it("records the requested files and the files actually analyzed", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [BOOK]: "// book, changed on this branch\n" },
    });

    gate.run([], { MUTATION_BASE: "main", MUTATION_SCOPE: LOAN });

    assert.deepEqual(gate.scopeRecord(), {
      selection: "explicit",
      requestedFiles: [LOAN],
      analyzedFiles: [LOAN],
      unavailable: null,
    });
  });

  it("applies to one execution and leaves the next run on the changed set", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [BOOK]: "// book, changed on this branch\n" },
    });

    gate.run([], { MUTATION_BASE: "main", MUTATION_SCOPE: LOAN });
    const ordinary = gate.run([], { MUTATION_BASE: "main" });

    assert.equal(ordinary.status, 0, ordinary.output);
    assert.deepEqual(gate.toolArguments(), ["run", "--mutate", BOOK]);
    assert.equal(gate.scopeRecord().selection, "changed-set");
    assert.equal(gate.scopeRecord().requestedFiles, null);
  });

  it("rejects an explicitly empty scope instead of analyzing nothing", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [BOOK]: "// book\n" },
      changed: { [LOAN]: "// loan, changed on this branch\n" },
    });

    const result = gate.run([], { MUTATION_BASE: "main", MUTATION_SCOPE: "" });

    assert.notEqual(result.status, 0);
    assert.match(result.output, /MUTATION_SCOPE names no files/);
    assert.equal(gate.calledTool(), false, "a wrong declaration must not be repaired");
    // The rejection is recorded, so a proof reader sees the setup failure
    // instead of having to read it out of a truncated log.
    assert.deepEqual(gate.scopeRecord(), {
      selection: "rejected",
      requestedFiles: [],
      analyzedFiles: null,
      unavailable: "MUTATION_SCOPE names no files, so the proof would analyze nothing",
    });
  });

  it("rejects a requested file that does not exist", (t) => {
    const gate = mutationSandbox(t, { files: { [LOAN]: "// loan\n" }, changed: {} });

    const result = gate.run([], {
      MUTATION_BASE: "main",
      MUTATION_SCOPE: "src/lending/domain/gone.ts",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.output, /does not exist/);
    assert.equal(gate.calledTool(), false);
    assert.equal(gate.scopeRecord().selection, "rejected");
    assert.match(gate.scopeRecord().unavailable, /does not exist/);
  });

  it("rejects a requested file the Gate cannot mutate", (t) => {
    const gate = mutationSandbox(t, {
      files: { [LOAN]: "// loan\n", [ADAPTER]: "// adapter\n" },
      changed: {},
    });

    const testFile = gate.run([], { MUTATION_BASE: "main", MUTATION_SCOPE: LOAN_TEST });
    assert.notEqual(testFile.status, 0);
    assert.match(testFile.output, /not an eligible mutation input/);
    assert.equal(gate.calledTool(), false);
    assert.deepEqual(gate.scopeRecord().requestedFiles, [LOAN_TEST]);

    const adapter = gate.run([], { MUTATION_BASE: "main", MUTATION_SCOPE: ADAPTER });
    assert.notEqual(adapter.status, 0);
    assert.match(adapter.output, /not an eligible mutation input/);
    assert.equal(gate.calledTool(), false);
    assert.deepEqual(gate.scopeRecord().requestedFiles, [ADAPTER]);
  });
});

// The proof runner is driven the same way, with a stand-in for the Entry Point:
// the stand-in always fails on Mutation and writes whatever scope record the
// check puts in front of it. What is under test is what the runner does with
// that record, not what the pinned tools would have measured. A complete run
// needs every proof's violation to apply, so its sandbox also carries the files
// those proofs patch and a stand-in for the build and dependency commands.
function proofSandbox(t, { complete = false } = {}) {
  const { root, stubs, git } = sandbox(t);
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
    writeFileSync(join(stubs, "npm"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(stubs, "npm"), 0o755);
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

const DECLARED = {
  selection: "explicit",
  requestedFiles: [LOAN],
  analyzedFiles: [LOAN],
  unavailable: null,
};

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
      unavailable: 'MUTATION_SCOPE names "src/lending/domain/loan.ts", which does not exist',
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
