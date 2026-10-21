// Runs dependency-cruiser with a rule set generated in memory, through its
// CLI. The CLI is the tested surface; the rules stay in Gate code.
import { rmSync, writeFileSync } from "node:fs";
import { run } from "./lib.mjs";

export function depcruise(rules) {
  const configPath = `.dependency-cruiser.${process.pid}.generated.cjs`;
  const config = {
    forbidden: rules,
    options: {
      doNotFollow: { path: "node_modules" },
      tsConfig: { fileName: "tsconfig.json" },
      tsPreCompilationDeps: true,
    },
  };
  writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};\n`);
  try {
    return run("depcruise", ["--config", configPath, "--output-type", "err", "src"]);
  } finally {
    rmSync(configPath, { force: true });
  }
}
