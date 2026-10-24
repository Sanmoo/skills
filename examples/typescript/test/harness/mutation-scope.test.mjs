// Checks at the Mutation Gate's executable boundary.
//
// A Gate Proof shows that the Gate reaches its inputs through the Entry Point.
// These checks show what no single proof can: that ordinary changed-set
// discovery still selects what it should, that a declared proof scope replaces
// it for one execution, that both scopes are recorded, and that a wrong
// declaration fails loudly instead of widening or passing with nothing
// analyzed. Everything here drives the same executable the Entry Point drives,
// against controlled Git trees and a stand-in for the pinned mutation tool, so
// the checks observe selection, exit status and persisted evidence rather than
// any helper's name or layout. The Gate runs them before it measures.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { baseEnvironment, newSandbox, writeTree } from "../support/harness-sandbox.mjs";

const PROJECT = dirname(dirname(import.meta.dirname));
const MUTATION = join(PROJECT, "scripts", "check-mutation.mjs");
const LOAN = "src/lending/domain/loan.ts";
const LOAN_TEST = "src/lending/domain/loan.test.ts";
const BOOK = "src/catalog/domain/book.ts";
const ADAPTER = "src/lending/adapters/postgres-loan-repository.ts";
const SCOPE_RECORD = "reports/mutation/scope.json";

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
  const command = join(stubs, "bin", "stryker");
  mkdirSync(join(stubs, "bin"), { recursive: true });
  writeFileSync(command, `#!/bin/sh\nexec node ${JSON.stringify(tool)} "$@"\n`);
  chmodSync(command, 0o755);
  return { recorded };
}

// A controlled tree that has already committed a base and checked out the branch
// a proof would run on.
function mutationSandbox(t, { files, changed = {} }) {
  const { root, stubs, git } = newSandbox(t);
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
      analyzedFilesUnavailable: null,
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
      analyzedFilesUnavailable: null,
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
      analyzedFilesUnavailable: "MUTATION_SCOPE cannot narrow the scheduled --full run",
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
      analyzedFilesUnavailable: null,
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
      analyzedFilesUnavailable: "MUTATION_SCOPE names no files, so the proof would analyze nothing",
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
    assert.match(gate.scopeRecord().analyzedFilesUnavailable, /does not exist/);
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
