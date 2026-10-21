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

export function report(gate, failures) {
  if (failures.length === 0) {
    console.log(`✔ ${gate}`);
    return;
  }
  console.error(`✘ ${gate}`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
