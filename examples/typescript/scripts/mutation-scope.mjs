// The record a Mutation run leaves of the scope it selected and the files it
// actually analyzed, and the transport a Gate Proof's declared scope arrives on.
// The wrapper writes the record and the Gate Proof runner reads it, so both live
// here: a field renamed in one place cannot silently stop the proof evidence
// from being checked.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// A stack chooses how a declared proof scope reaches its Gate. This one carries
// it in the environment of the single execution, so it cannot outlive the run.
export const MUTATION_SCOPE_ENV = "MUTATION_SCOPE";
export const MUTATION_SCOPE_RECORD = "reports/mutation/scope.json";

// How a run arrived at its inputs. `rejected` is a declared scope that named
// something unusable: nothing was analyzed, and the record says why.
export const SELECTION = {
  explicit: "explicit",
  changedSet: "changed-set",
  wholeCodebase: "whole-codebase",
  rejected: "rejected",
};

// `analyzedFiles` is null when the analysis produced no readable scope, and
// `analyzedFilesUnavailable` says so, so a reader cannot mistake that for a run
// that analyzed an empty set. `analysisCompleted` separates a Gate that failed
// its limits from one whose tooling failed before there was anything to score.
export function writeScopeRecord({
  selection,
  requestedFiles,
  analyzedFiles,
  analyzedFilesUnavailable,
  analysisCompleted,
}) {
  mkdirSync(dirname(MUTATION_SCOPE_RECORD), { recursive: true });
  writeFileSync(
    MUTATION_SCOPE_RECORD,
    `${JSON.stringify(
      { selection, requestedFiles, analyzedFiles, analyzedFilesUnavailable, analysisCompleted },
      null,
      2,
    )}\n`,
  );
}

// A declaration that named something unusable. Nothing was analyzed, and the
// reason is part of the record rather than only of the log.
export function rejectedScope(requestedFiles, reason) {
  return {
    selection: SELECTION.rejected,
    requestedFiles,
    analyzedFiles: null,
    analyzedFilesUnavailable: reason,
    analysisCompleted: false,
  };
}

// Yields the record, or null with the reason there is none. A missing or
// unreadable record is not an empty scope.
export function readScopeRecord() {
  if (!existsSync(MUTATION_SCOPE_RECORD)) {
    return { record: null, reason: `there is no scope record at ${MUTATION_SCOPE_RECORD}` };
  }
  try {
    return { record: JSON.parse(readFileSync(MUTATION_SCOPE_RECORD, "utf8")), reason: null };
  } catch {
    return { record: null, reason: `${MUTATION_SCOPE_RECORD} is not valid JSON` };
  }
}
