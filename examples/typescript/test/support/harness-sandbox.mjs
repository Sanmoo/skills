// Controlled Git trees and stand-ins for the pinned tools, for the Harness's own
// checks. A check drives a real executable against a throwaway repository, so it
// observes selection, exit status and persisted evidence rather than any
// helper's name or layout.
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

// Git only tracks files, so a controlled tree is files plus commits.
export function writeTree(root, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

// A temporary directory pair: the controlled tree, and the stand-in tools that
// sit on PATH. Both are removed when the check ends.
export function newSandbox(t) {
  const root = mkdtempSync(join(tmpdir(), "harness-tree-"));
  const stubs = mkdtempSync(join(tmpdir(), "harness-stubs-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(stubs, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "--initial-branch=main");
  git("config", "user.email", "harness@example.invalid");
  git("config", "user.name", "Harness");
  return { root, stubs, git };
}

// The environment a check passes to a child. A check must not inherit the scope
// or base of the proof that ran before it, or an ordinary run would look
// scoped; each check adds only what it is about.
export function baseEnvironment(pathEntries) {
  const environment = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };
  delete environment.MUTATION_SCOPE;
  delete environment.MUTATION_BASE;
  // A check drives one mode with one scope; a setting exported by the shell or
  // left behind by the previous run must not narrow or widen it.
  delete environment.HARNESS_SCOPE;
  delete environment.HARNESS_MODE;
  delete environment.HARNESS_BASE;
  delete environment.HARNESS_POLICY_VERSION;
  environment.PATH = `${pathEntries.join(delimiter)}${delimiter}${process.env.PATH ?? ""}`;
  return environment;
}

// A stand-in for a pinned tool that only has to succeed: a proof's build or
// dependency step needs no more when the check is about something else.
export function stubCommand(stubs, name, directory = "") {
  const command = join(stubs, directory, name);
  mkdirSync(dirname(command), { recursive: true });
  writeFileSync(command, "#!/bin/sh\nexit 0\n");
  chmodSync(command, 0o755);
  return command;
}
