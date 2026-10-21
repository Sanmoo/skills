// Wraps a Gate command so every Gate names itself in the Entry Point output,
// whether it passes or fails. A finding is a non-zero exit, never a warning.
import { spawnSync } from "node:child_process";

const [gate, separator, ...command] = process.argv.slice(2);
if (gate === undefined || separator !== "--" || command.length === 0) {
  console.error("usage: node scripts/run-gate.mjs <Gate name> -- <command> [args...]");
  process.exit(2);
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
});

if (result.status === 0) {
  console.log(`✔ ${gate}`);
  process.exit(0);
}
console.error(`✘ ${gate}`);
process.exit(result.status ?? 1);
