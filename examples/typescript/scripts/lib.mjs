import { spawnSync } from "node:child_process";

// Runs a command with the caller's environment plus the colour-free defaults a
// Gate's output needs. A caller that passes `env` adds to that environment
// rather than replacing the defaults, so a Gate Proof can hand one execution a
// setting written here and the child still prints without colour codes.
export function run(command, args, { env = {}, ...options } = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    ...options,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env },
  });
}

export function outputOf(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

export function report(gate, failures) {
  if (failures.length === 0) {
    console.log(`✔ ${gate}`);
    return;
  }
  console.error(`✘ ${gate}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
