// Ordinary changed-set discovery, verified on its own: an explicit Gate Proof
// scope shows enforcement, not that discovery from git still works.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { changedFiles } from "../../scripts/changes.mjs";
import { changedSet } from "../../scripts/mutation-scope.mjs";
import { scratchRepository } from "./support.mjs";

const policy = { eligible: "^src/.+\\.ts$", ineligible: "\\.test\\.ts$" };

/** A topic branch one (empty) commit ahead of main, so HEAD is not the base tip. */
function topic(repo) {
  repo.run("switch", "-q", "-c", "topic");
  repo.commit("topic");
}

function inRepo(repo) {
  return { exists: (file) => existsSync(join(repo.dir, file)) };
}

describe("changed-set discovery", () => {
  it("is legitimately empty on a branch that changes nothing", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n" });
    topic(repo);
    assert.deepEqual(changedSet("main", policy, repo.git, inRepo(repo).exists).files, []);
  });

  it("includes committed, staged, unstaged and untracked changes", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n", "src/b.ts": "b\n", "src/c.ts": "c\n" });
    topic(repo);
    repo.write("src/a.ts", "a2\n");
    repo.commit("committed");
    repo.write("src/b.ts", "b2\n");
    repo.run("add", "src/b.ts");
    repo.write("src/c.ts", "c2\n");
    repo.write("src/d.ts", "new\n");
    assert.deepEqual(changedSet("main", policy, repo.git, inRepo(repo).exists).files, [
      "src/a.ts",
      "src/b.ts",
      "src/c.ts",
      "src/d.ts",
    ]);
  });

  it("keeps deleted files in the change but not in the mutation set", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n" });
    topic(repo);
    repo.run("rm", "-q", "src/a.ts");
    assert.deepEqual(changedFiles("main", repo.git).files, ["src/a.ts"]);
    assert.deepEqual(changedSet("main", policy, repo.git, inRepo(repo).exists).files, []);
  });

  it("drops tests and files outside the eligible tree from the mutation set", () => {
    const repo = scratchRepository({});
    topic(repo);
    repo.write("src/a.test.ts");
    repo.write("docs/a.md");
    repo.write("scripts/a.ts");
    assert.deepEqual(changedSet("main", policy, repo.git, inRepo(repo).exists).files, []);
  });

  it("measures the tip commit against its first parent when HEAD is the base tip", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n", "src/b.ts": "b\n" });
    repo.write("src/b.ts", "b2\n");
    repo.commit("tip");
    assert.deepEqual(changedFiles("main", repo.git).files, ["src/b.ts"]);
  });

  it("prefers origin's base over a stale local branch", () => {
    const upstream = scratchRepository({ "src/a.ts": "a\n" });
    upstream.write("src/a.ts", "a2\n");
    upstream.commit("moved on");
    const repo = scratchRepository({ "src/a.ts": "a\n" });
    repo.run("remote", "add", "origin", upstream.dir);
    repo.run("fetch", "-q", "origin");
    repo.run("switch", "-q", "-c", "topic", "origin/main");
    repo.commit("topic");
    assert.equal(changedFiles("main", repo.git).base, "refs/remotes/origin/main");
    assert.deepEqual(changedFiles("main", repo.git).files, []);
  });

  it("reports changes outside the project directory separately", () => {
    const repo = scratchRepository({ "project/src/a.ts": "a\n", "other/b.md": "b\n" });
    topic(repo);
    repo.write("other/b.md", "b2\n");
    repo.write("project/src/a.ts", "a2\n");
    const inProject = (args) => repo.git(["-C", "project", ...args]);
    const result = changedFiles("main", inProject);
    assert.deepEqual(result.files, ["src/a.ts"]);
    assert.deepEqual(result.outside, ["other/b.md"]);
  });

  it("widens when the base cannot be resolved", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n" });
    assert.match(changedFiles("trunk", repo.git).widened, /base branch trunk cannot be resolved/);
  });

  it("widens when HEAD is the base tip and has no earlier commit", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n" });
    assert.match(changedFiles("main", repo.git).widened, /no earlier commit/);
  });

  it("widens when HEAD shares no history with the base", () => {
    const repo = scratchRepository({ "src/a.ts": "a\n" });
    repo.run("switch", "-q", "--orphan", "island");
    repo.write("src/z.ts");
    repo.commit("unrelated");
    assert.match(changedFiles("main", repo.git).widened, /shares no history/);
  });

  it("widens when there is no commit at all", () => {
    assert.match(changedFiles("main", () => undefined).widened, /no commit/);
  });
});
