// The files a change touches relative to the base branch: committed changes
// since the merge base, the working tree, and untracked files. Shared by the
// selection policy and the Mutation Gate, so both see the same change.

/** Resolves the base branch, preferring origin so a stale local branch cannot change the measured set. */
export function resolveBase(base, git) {
  const remotes = (git(["remote"]) ?? "").split("\n").filter(Boolean);
  const others = remotes.filter((remote) => remote !== "origin");
  const candidates = [
    `refs/remotes/origin/${base}`,
    `refs/heads/${base}`,
    ...others.map((r) => `refs/remotes/${r}/${base}`),
  ];
  for (const ref of candidates) {
    const sha = git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    if (sha) return { ref, sha };
  }
  return undefined;
}

/**
 * Every changed path relative to `base`, deleted ones included, or
 * `{ widened: reason }` when the change cannot be established. When HEAD is
 * the base tip, the change is what landed with the tip commit. `git` runs a
 * git command in the project directory and returns stdout or undefined.
 */
export function changedFiles(base, git) {
  const head = git(["rev-parse", "--verify", "--quiet", "HEAD"]);
  if (!head) return { widened: "there is no commit to compare against" };
  const resolved = resolveBase(base, git);
  if (!resolved) return { widened: `the base branch ${base} cannot be resolved` };
  let compare;
  if (resolved.sha === head) {
    compare = git(["rev-parse", "--verify", "--quiet", "HEAD^1"]);
    if (!compare) return { widened: `HEAD is the tip of ${base} and has no earlier commit` };
  } else {
    compare = git(["merge-base", "HEAD", resolved.sha]);
    if (!compare) return { widened: `HEAD shares no history with ${resolved.ref}` };
  }
  const tracked = git(["diff", "--name-only", "--relative", "--no-renames", compare]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  if (tracked === undefined || untracked === undefined)
    return { widened: "the changed files cannot be listed" };
  const files = [...new Set([...tracked.split("\n"), ...untracked.split("\n")])]
    .filter(Boolean)
    .sort();
  return { files, base: resolved.ref, compare };
}
