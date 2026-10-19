# Code is the source of truth; Guides hold only what code cannot express

Documentation that restates the code drifts from it, and agents act on whichever they read first. So in any Harness established by `bootstrap-harness`, the code (including Gate configuration) is the only authority on current state: Guides contain only intent and rationale, judgment rules no Gate can verify, and pointers into the code — never thresholds, module or context lists, or command catalogues beyond a single entry point. A Gate verifies that every pointer in a Guide resolves.

Two deliberate exceptions: `GLOSSARY.md` holds authority over naming (code that disagrees is wrong), with its `_Avoid_` terms enforced by a Gate; and ADRs are permitted because they record a decision at a point in time, are immutable once accepted, and are superseded rather than edited.

## Considered Options

- **Rich agent-oriented documentation** (architecture, standards, and testing documents describing the current system): rejected because it inevitably conflicts with the code and gives agents two competing sources of truth.
- **No documentation at all**: rejected because the code cannot express why an alternative was rejected, nor judgment rules that resist mechanical verification.
