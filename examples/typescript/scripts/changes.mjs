// The files a change touches relative to the base branch: committed changes
// since the merge base, the working tree, and untracked files. Shared by the
// selection policy and the Mutation Gate, so both see the same change.

/** Resolves the base branch, preferring origin so a stale local branch cannot change the measured set. */
/** The one base branch the selection and every changed-set Gate compare against. */
export function baseBranch(policyBase) {
  return process.env.MUTATION_BASE ?? policyBase;
}

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
 * Every changed path relative to `base`, deleted ones included, as project
 * paths in `files` and repository paths outside the project in `outside`; or
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
  // Paths come from the repository root, so a change outside this project is
  // seen too: the caller decides what it means rather than never knowing.
  const prefix = git(["rev-parse", "--show-prefix"]);
  const top = git(["rev-parse", "--show-toplevel"]);
  const tracked = git(["diff", "--name-only", "--no-renames", compare, "--", top ?? "."]);
  const untracked =
    top === undefined ? undefined : git(["-C", top, "ls-files", "--others", "--exclude-standard"]);
  if (prefix === undefined || tracked === undefined || untracked === undefined)
    return { widened: "the changed files cannot be listed" };
  const all = [...new Set([...tracked.split("\n"), ...untracked.split("\n")])].filter(Boolean);
  const files = all
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
    .sort();
  const outside = all.filter((path) => !path.startsWith(prefix)).sort();
  return { files, outside, base: resolved.ref, compare };
}
