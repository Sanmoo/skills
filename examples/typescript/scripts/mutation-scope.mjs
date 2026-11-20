// Which files the Mutation Gate mutates. Three sources, in order:
//   - a Gate Proof's declared scope (MUTATION_SCOPE), which replaces the
//     changed set for that one execution and fails when empty or ineligible;
//   - the whole codebase, for integral validation or when the changed set
//     cannot be established (a widening, reported, never a finding);
//   - the changed set: files changed relative to the base branch, including
//     the working tree and untracked files.
import { existsSync } from "node:fs";
import { changedFiles } from "./changes.mjs";

export class InvalidScope extends Error {}

export function isEligible(file, policy) {
  return new RegExp(policy.eligible).test(file) && !new RegExp(policy.ineligible).test(file);
}

/** Parses a declared scope. Missing means "not declared"; empty or ineligible is an error. */
export function declaredScope(value, policy, exists = existsSync) {
  if (value === undefined) return undefined;
  const files = value.split(/[\s,]+/).filter(Boolean);
  if (files.length === 0) throw new InvalidScope("the declared mutation scope is empty");
  for (const file of files) {
    if (!exists(file))
      throw new InvalidScope(`the declared mutation scope names a missing file: ${file}`);
    if (!isEligible(file, policy))
      throw new InvalidScope(`the declared mutation scope names an ineligible file: ${file}`);
  }
  return files;
}

/**
 * The eligible files changed relative to `base`, or `{ widened: reason }` when
 * the changed set cannot be established.
 */
export function changedSet(base, policy, git, exists = existsSync) {
  const changed = changedFiles(base, git);
  if (changed.widened) return changed;
  return {
    ...changed,
    files: changed.files.filter((file) => exists(file) && isEligible(file, policy)),
  };
}
