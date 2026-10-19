// Gate: every skill has valid frontmatter and the skills CLI discovers it.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { report } from "./lib.mjs";

const SKILLS_CLI = "skills@1.7.2";
const failures = [];
const names = [];

for (const dir of readdirSync("skills", { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const path = `skills/${dir.name}/SKILL.md`;
  if (!existsSync(path)) {
    failures.push(`${path} is missing`);
    continue;
  }
  const front = readFileSync(path, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
  if (!front) {
    failures.push(`${path} has no frontmatter`);
    continue;
  }
  const field = (key) => front[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim();
  const name = field("name");
  if (name !== dir.name) failures.push(`${path}: name "${name}" must equal its directory name`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? "")) failures.push(`${path}: name must be lowercase-hyphenated`);
  if (!field("description")) failures.push(`${path}: description is required`);
  names.push(dir.name);
}

const cli = spawnSync("npx", ["-y", SKILLS_CLI, "add", ".", "--list"], {
  encoding: "utf8",
  env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
const output = `${cli.stdout}\n${cli.stderr}`.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
if (cli.status !== 0) failures.push(`${SKILLS_CLI} add . --list exited with status ${cli.status}`);
const listed = new Set(output.split("\n").map((l) => l.replace(/^[\s│|]+/, "").trim()));
for (const line of output.split("\n")) if (/Skipped/.test(line)) failures.push(line.trim());
for (const name of names) if (!listed.has(name)) failures.push(`skills CLI does not discover "${name}"`);

report("Skills discoverable", failures);
