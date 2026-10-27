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

// The scope validation by change selected, as a check receives it. A check
// without a scope verifies its whole input; one whose scope names no file it can
// verify fails instead of passing with nothing examined.
export function scopedFiles(gate, noun, matches) {
  const declared = process.env.HARNESS_SCOPE;
  if (declared === undefined) return undefined;
  const files = JSON.parse(declared).filter(matches);
  if (files.length === 0) {
    report(gate, [`HARNESS_SCOPE names no ${noun} file, so the Gate would verify nothing`]);
  }
  return files;
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
