import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** A throwaway git repository with `main` holding `files`. Returns helpers bound to it. */
export function scratchRepository(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "harness-test-"));
  const run = (...args) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const write = (path, text = "x\n") => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  const commit = (message) => {
    run("add", "-A");
    run(
      "-c",
      "user.name=test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      message,
    );
  };
  run("init", "-q", "-b", "main");
  for (const [path, text] of Object.entries(files)) write(path, text);
  commit("base");
  const git = (args) => {
    try {
      return run(...args);
    } catch {
      return undefined;
    }
  };
  return { dir, run, write, commit, git };
}
