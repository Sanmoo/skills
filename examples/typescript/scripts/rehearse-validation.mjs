// Rehearses the full Entry Point's two modes on disposable copies of the
// project, each its own git repository with a controlled policy fixture.
// Kept out of both Entry Points; run with `npm run rehearse-validation`. The
// transcript it prints is run output and is not committed.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { disposableCopy } from "./disposable-copy.mjs";

function repository(prefix, prepareBase) {
  const copy = disposableCopy(prefix);
  const git = (...args) => execFileSync("git", args, { cwd: copy.dir, stdio: "ignore" });
  const commit = (message) => {
    git("add", "-A");
    git(
      "-c",
      "user.name=rehearsal",
      "-c",
      "user.email=rehearsal@example.invalid",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      message,
    );
  };
  git("init", "-q", "-b", "main");
  prepareBase(copy.dir);
  commit("base");
  git("switch", "-q", "-c", "change");
  commit("start the change");
  return { ...copy, commit };
}

function edit(dir, file, change) {
  writeFileSync(join(dir, file), change(readFileSync(join(dir, file), "utf8")));
}

function policyFixture(dir, change) {
  edit(dir, "harness/policy.json", (text) => JSON.stringify(change(JSON.parse(text))));
  // A fixture is held to the same Format Gate as the policy it replaces.
  execFileSync(
    "node_modules/.bin/prettier",
    ["--write", "--log-level", "warn", "harness/policy.json"],
    {
      cwd: dir,
    },
  );
}

function entryPoint(dir, mode = "change", env = {}) {
  const run = spawnSync("make", ["--no-print-directory", "check", `MODE=${mode}`], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const output = `${run.stdout}${run.stderr}`;
  outputs.push(output);
  const report = JSON.parse(readFileSync(join(dir, "reports/validation.json"), "utf8"));
  return { status: run.status, output, report };
}

let outputs = [];
const entry = (report, id) => report.checks.find((check) => check.id === id);
const results = [];

function scenario(name, body) {
  console.log(`\n=== ${name}`);
  const failures = [];
  outputs = [];
  const expect = (condition, what) => {
    if (!condition) failures.push(what);
  };
  try {
    body(expect);
  } catch (error) {
    failures.push(`threw: ${error.stack}`);
  }
  for (const failure of failures) console.log(`  ✘ ${failure}`);
  if (failures.length > 0) {
    for (const output of outputs)
      console.log(`--- Entry Point output (tail)\n${output.split("\n").slice(-25).join("\n")}`);
  }
  console.log(failures.length === 0 ? "  ✔ as expected" : "  ✘ not as expected");
  results.push(failures.length === 0);
}

scenario("a violation in an affected dependent is caught, not just listed", (expect) => {
  const repo = repository("rehearsal-dependent-", (dir) =>
    edit(
      dir,
      "src/lending/application/lending-service.ts",
      (t) => `${t}\nconst unusedRehearsal = 1;\n`,
    ),
  );
  try {
    edit(
      repo.dir,
      "src/catalog/index.ts",
      (t) => `${t}// a harmless change to the Catalog's public interface\n`,
    );
    const { status, report, output } = entryPoint(repo.dir);
    expect(
      status !== 0 && report.outcome === "failed",
      `non-zero and failed, got ${String(status)} ${report.outcome}`,
    );
    expect(report.widened === null, "the selection is not widened");
    expect(
      report.affected.includes("src/lending/application/lending-service.ts"),
      "the dependent is affected",
    );
    expect(report.failed?.id === "lint", `Lint fails, got ${JSON.stringify(report.failed)}`);
    expect(
      entry(report, "lint").scope.includes("src/lending/application/lending-service.ts"),
      "Lint verified the dependent",
    );
    expect(
      output.includes("lending-service.ts") && output.includes("unusedRehearsal"),
      "the dependent's violation is named",
    );
  } finally {
    repo.remove();
  }
});

scenario("a shared configuration change widens the selection", (expect) => {
  const repo = repository("rehearsal-widen-", (dir) =>
    edit(dir, "src/catalog/domain/book.ts", (t) =>
      t.replace("  const bookId", "      const bookId"),
    ),
  );
  try {
    edit(repo.dir, ".prettierrc.json", (t) => t.replace("{", '{\n  "semi": true,'));
    const { status, report } = entryPoint(repo.dir);
    expect(
      status !== 0 && report.outcome === "failed",
      `non-zero and failed, got ${String(status)} ${report.outcome}`,
    );
    expect(
      /shared configuration changed: \.prettierrc\.json/.test(report.widened ?? ""),
      `widened, got ${String(report.widened)}`,
    );
    expect(
      report.checks.filter((c) => c.decision === "run").every((c) => c.scope === "whole"),
      "every applicable check runs over its whole input",
    );
    expect(
      report.failed?.id === "format",
      `Format catches the untouched file, got ${JSON.stringify(report.failed)}`,
    );
  } finally {
    repo.remove();
  }
});

scenario("required validation beyond the budget is inconclusive and starts nothing", (expect) => {
  const repo = repository("rehearsal-budget-", (dir) =>
    policyFixture(dir, (p) => ({ ...p, budgetSeconds: 100 })),
  );
  try {
    edit(repo.dir, "src/lending/domain/loan.ts", (t) => `${t}// a change to the core domain\n`);
    const { status, report, output } = entryPoint(repo.dir);
    expect(status !== 0, `non-zero, got ${String(status)}`);
    expect(report.outcome === "inconclusive", `inconclusive, got ${report.outcome}`);
    expect(
      report.checks.every((c) => c.outcome === undefined),
      "no check has an outcome",
    );
    expect(!output.includes("▶"), "no check was started");
    expect(
      !existsSync(join(repo.dir, "reports/mutation")) && !existsSync(join(repo.dir, "reports/e2e")),
      "no expensive check left output",
    );
    expect(
      /beyond the 100 s budget/.test(output) && /To proceed/.test(output),
      "the decision needed is named",
    );
  } finally {
    repo.remove();
  }
});

scenario(
  "integral validation runs the periodic check validation by change only reports",
  (expect) => {
    const keep = new Set(["format", "mutation-whole"]);
    const repo = repository("rehearsal-integral-", (dir) =>
      policyFixture(dir, (p) => ({ ...p, checks: p.checks.filter((c) => keep.has(c.id)) })),
    );
    try {
      edit(repo.dir, "src/lending/domain/loan.ts", (t) => `${t}// a change to the core domain\n`);
      const before = entryPoint(repo.dir);
      expect(before.status === 0, `change mode green, got ${String(before.status)}`);
      expect(
        entry(before.report, "mutation-whole").decision === "periodic",
        "change mode reports it as periodic",
      );
      expect(
        entry(before.report, "mutation-whole").last.outcome === "not recorded",
        "with no integral result yet",
      );
      expect(
        /not integral verification/.test(before.output),
        "the green result does not claim integral verification",
      );

      const integral = entryPoint(repo.dir, "integral");
      expect(integral.status === 0, `integral green, got ${String(integral.status)}`);
      expect(
        entry(integral.report, "mutation-whole").outcome === "passed",
        "integral validation ran it",
      );
      const after = entryPoint(repo.dir);
      expect(
        entry(after.report, "mutation-whole").last.outcome === "passed",
        "change mode now reports the last integral result",
      );
    } finally {
      repo.remove();
    }
  },
);

scenario(
  "a periodic failure blocks a change in its scope and is reported to an independent one",
  (expect) => {
    const keep = new Set(["format", "mutation-whole"]);
    const repo = repository("rehearsal-periodic-", (dir) => {
      policyFixture(dir, (p) => ({ ...p, checks: p.checks.filter((c) => keep.has(c.id)) }));
    });
    try {
      // The fixture lives outside the copy, so it is not part of the change.
      const status = join(tmpdir(), `integral-fixture-${String(process.pid)}.json`);
      writeFileSync(
        status,
        JSON.stringify({
          finishedAt: "fixture",
          commit: "fixture",
          checks: { "mutation-whole": "failed" },
        }),
      );
      const env = { HARNESS_INTEGRAL_STATUS: status };
      edit(repo.dir, "GLOSSARY.md", (t) =>
        t.replace("A small public library", "A small, public library"),
      );
      const independent = entryPoint(repo.dir, "change", env);
      expect(
        independent.status === 0,
        `an independent change proceeds, got ${String(independent.status)}`,
      );
      expect(
        /last integral result: failed/.test(independent.output),
        "and the failure is still reported",
      );
      edit(
        repo.dir,
        "src/lending/domain/loan.ts",
        (t) => `${t}// a change in the failed check's scope\n`,
      );
      const covered = entryPoint(repo.dir, "change", env);
      expect(
        covered.status !== 0 && covered.report.outcome === "failed",
        `a change in its scope is not green, got ${String(covered.status)} ${covered.report.outcome}`,
      );
    } finally {
      repo.remove();
    }
  },
);

const passed = results.filter(Boolean).length;
console.log(
  `\n${String(passed)}/${String(results.length)} rehearsal scenarios behaved as expected`,
);
process.exit(passed === results.length ? 0 : 1);
