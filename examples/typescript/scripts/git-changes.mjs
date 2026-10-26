// The changed set every Gate and the full Entry Point's modes measure against.
//
// Git is the only authority on what changed, so the resolution lives in one
// place: the Mutation Gate's changed-set scope and the Entry Point's impact
// selection must agree about the base, the merge base and the working tree, or
// one mode would verify a different change than the other.
import { relative } from "node:path";
import { run } from "./lib.mjs";

// Returns the command's trimmed stdout, or undefined when it failed. A
// successful command that printed nothing yields the empty string.
function git(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

// A command's non-empty output lines, or undefined when the command failed;
// callers must not read a failure as "nothing here".
function gitLines(args) {
  const output = git(args);
  if (output === undefined) return undefined;
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function baseRefs(base) {
  // CI checks out a commit without a local branch, so the base usually exists
  // only as a remote-tracking ref. `origin` comes first and the other remotes
  // follow in sorted order, so a clone with extra remotes resolves the same
  // base as CI. The bare branch name comes last, for a base that exists only
  // locally.
  const remotes = gitLines(["remote"]);
  if (remotes === undefined) return undefined;
  const rest = remotes.filter((remote) => remote !== "origin").sort();
  const ordered = remotes.includes("origin") ? ["origin", ...rest] : rest;
  return [...new Set([...ordered.map((remote) => `${remote}/${base}`), base])];
}

export function headCommit() {
  return git(["rev-parse", "HEAD"]);
}

// The commit a change is measured against: the branch tip's common ancestor
// with the comparison base. When HEAD is the base branch's own tip the change
// is what landed with that commit, so its first parent is the base.
export function resolveComparison(base) {
  const refs = baseRefs(base);
  if (refs === undefined) {
    return { reason: `the remotes cannot be listed to resolve "${base}"` };
  }
  let resolved;
  for (const ref of refs) {
    const tip = git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    if (tip !== undefined) {
      resolved = { ref, tip };
      break;
    }
  }
  if (resolved === undefined) {
    return { reason: `base "${base}" is not resolvable here` };
  }
  const head = headCommit();
  if (head === undefined) {
    return { reason: "HEAD is not resolvable here" };
  }
  if (resolved.tip === head) {
    const parent = git(["rev-parse", "--verify", "--quiet", `${resolved.tip}^`]);
    if (parent === undefined) {
      return { reason: `${resolved.ref} has no earlier commit here` };
    }
    return { base: resolved.ref, commit: parent };
  }
  const mergeBase = git(["merge-base", resolved.tip, head]);
  if (mergeBase === undefined) {
    return { reason: `"${resolved.ref}" has no common ancestor with HEAD` };
  }
  return { base: resolved.ref, commit: mergeBase };
}

// git diff reports paths from the repository root while git ls-files reports
// them from the current directory; normalise both to the current directory.
// Returns undefined when the root cannot be read, so the caller widens instead
// of filtering un-normalised paths away.
function normaliseToWorkingDirectory(paths) {
  const root = git(["rev-parse", "--show-toplevel"]);
  if (root === undefined) return undefined;
  const prefix = relative(root, process.cwd()).split("\\").join("/");
  if (prefix === "" || prefix === ".") return paths;
  return paths.map((path) =>
    path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : path,
  );
}

// Every path the working tree changed relative to `commit`, including staged,
// unstaged and untracked files, normalised to the current directory and
// sorted. Returns the reason when the changed set cannot be established.
export function changedPathsSince(commit) {
  const changed = gitLines(["diff", "--name-only", commit]);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard"]);
  if (changed === undefined || untracked === undefined) {
    return { reason: "the changed files cannot be listed" };
  }
  const paths = normaliseToWorkingDirectory([...changed, ...untracked]);
  if (paths === undefined) {
    return { reason: "the project root is not resolvable here" };
  }
  return { paths: [...new Set(paths)].sort() };
}
