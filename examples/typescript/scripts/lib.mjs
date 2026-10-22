import { spawnSync } from "node:child_process";

export function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    ...options,
  });
}

export function outputOf(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

// `notes` are not findings: they record a scope or configuration fact the Gate
// had to state, such as mutating the whole codebase because the base branch is
// not resolvable. They are printed so they reach the Gate's recorded output.
export function report(gate, failures, notes = []) {
  for (const note of notes) console.log(`  note: ${note}`);
  if (failures.length === 0) {
    console.log(`✔ ${gate}`);
    return;
  }
  console.error(`✘ ${gate}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
