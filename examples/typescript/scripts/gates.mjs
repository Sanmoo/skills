// The command behind each check in harness/policy.json. `scope` is "whole",
// "changed", or the list of affected files the check verifies.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { git } from "./lib.mjs";

const bin = (tool) => `node_modules/.bin/${tool}`;
const LINTABLE = /\.(ts|mts|mjs|cjs)$/;

function files(scope, pattern) {
  return Array.isArray(scope) ? scope.filter((file) => pattern.test(file)) : null;
}

function runAll(commands) {
  for (const [command, ...args] of commands) {
    const result = spawnSync(command, args, { stdio: "inherit" });
    if (result.error) {
      console.error(`${command} could not start: ${result.error.message}`);
      return false;
    }
    if (result.status !== 0) return false;
  }
  return true;
}

function vitest(project, scope) {
  if (scope === "whole") return [[bin("vitest"), "run", "--project", project]];
  // An affected scope may legitimately hold no test of this level.
  return [[bin("vitest"), "related", "--run", "--project", project, "--passWithNoTests", ...scope]];
}

function secrets() {
  const top = git(["rev-parse", "--show-toplevel"]);
  if (top === undefined) return [["false"]];
  const config = `${process.cwd()}/.gitleaks.toml`;
  return [
    ["gitleaks", "git", "--config", config, "--redact", "--no-banner", top],
    ["gitleaks", "dir", "--config", config, "--redact", "--no-banner", "."],
  ];
}

const COMMANDS = {
  format: (scope) => [
    [bin("prettier"), "--check", "--ignore-unknown", ...(Array.isArray(scope) ? scope : ["."])],
  ],
  lint: (scope) => {
    const targets = files(scope, LINTABLE);
    if (targets?.length === 0) return [];
    return [[bin("eslint"), "--max-warnings", "0", "--no-warn-ignored", ...(targets ?? ["."])]];
  },
  types: () => [[bin("tsc"), "--noEmit", "-p", "tsconfig.json"]],
  unit: (scope) => vitest("unit", scope),
  boundaries: () => [[bin("depcruise"), "--config", ".dependency-cruiser.boundaries.cjs", "src"]],
  "dependency-rule": () => [
    [bin("depcruise"), "--config", ".dependency-cruiser.domain.cjs", "src"],
  ],
  metrics: () => [
    [bin("eslint"), "--config", "eslint.metrics.config.mjs", "--max-warnings", "0", "src"],
    [bin("depcruise"), "--config", ".dependency-cruiser.cycles.cjs", "src"],
    [bin("jscpd"), "--config", ".jscpd.json"],
  ],
  secrets,
  "avoided-terms": () => [[process.execPath, "scripts/check-avoided-terms.mjs"]],
  "guide-pointers": () => [[process.execPath, "scripts/check-guide-pointers.mjs"]],
  harness: () => [[process.execPath, "--test", "test/harness/*.test.mjs"]],
  integration: (scope) => vitest("integration", scope),
  e2e: () => {
    rmSync("dist", { recursive: true, force: true });
    return [
      [bin("tsc"), "-p", "tsconfig.build.json"],
      [process.execPath, "scripts/run-e2e.mjs"],
    ];
  },
  vulnerabilities: () => [["npm", "audit", "--audit-level=high"]],
  mutation: (scope) => [
    [process.execPath, "scripts/check-mutation.mjs", ...(scope === "whole" ? ["--whole"] : [])],
  ],
  "mutation-whole": () => [[process.execPath, "scripts/check-mutation.mjs", "--whole"]],
};

/** Runs one check over its scope; true when it passed. */
export function runCheck(check, scope) {
  const commands = COMMANDS[check.id];
  if (commands === undefined) throw new Error(`policy names a check with no command: ${check.id}`);
  return runAll(commands(scope));
}

export const KNOWN_CHECKS = Object.keys(COMMANDS);
