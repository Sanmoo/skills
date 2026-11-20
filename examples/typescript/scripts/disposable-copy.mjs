// A disposable copy of the project for the rehearsal and the e2e executor
// verification: every file git does not ignore, with node_modules linked
// rather than copied. Nothing done in the copy reaches the working tree.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export function disposableCopy(prefix) {
  const source = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean);
  for (const file of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    try {
      cpSync(join(source, file), join(dir, file), { verbatimSymlinks: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error; // a file deleted in the working tree
    }
  }
  symlinkSync(resolve(source, "node_modules"), join(dir, "node_modules"));
  return {
    dir,
    remove: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
