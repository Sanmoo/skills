// Helpers shared by the repository-owned Gates and the Harness tooling.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Files under `dirs` (recursively) whose names match `pattern`, sorted. */
export function listFiles(dirs, pattern) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (pattern.test(path)) found.push(path);
    }
  };
  for (const dir of dirs) walk(dir);
  return found.sort();
}

/** Runs git in the example directory and returns trimmed stdout, or undefined on failure. */
export function git(args, cwd = process.cwd()) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

/** Prints a Gate's result and exits non-zero naming the Gate and each offending location. */
export function report(gate, failures) {
  if (failures.length === 0) {
    console.log(`✔ ${gate}`);
    return;
  }
  console.error(`✘ ${gate}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
