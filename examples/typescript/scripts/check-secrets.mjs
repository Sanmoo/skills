// Gate: Secrets.
//
// gitleaks is pinned by mise.toml. The working tree and the full git history
// are both scanned; a finding is a non-zero exit.
import { outputOf, report, run } from "./lib.mjs";

const failures = [];

const version = run("gitleaks", ["version"]);
if (version.status !== 0) {
  report("Secrets", [
    "gitleaks is not installed; run `mise install` (pinned in mise.toml) before the Entry Point",
  ]);
}

for (const [scope, args] of [
  ["working tree", ["dir", ".", "--config", ".gitleaks.toml", "--no-banner", "--redact"]],
  ["history", ["git", ".", "--config", ".gitleaks.toml", "--no-banner", "--redact"]],
]) {
  const scan = run("gitleaks", args);
  if (scan.status !== 0) {
    failures.push(`secret found in the ${scope}:\n${outputOf(scan)}`);
  }
}

report("Secrets", failures);
