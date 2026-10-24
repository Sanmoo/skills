# Extend bootstrap-harness with an adoption path

`bootstrap-harness` began as a day-zero skill: it ended the run as soon as application source existed. That left maintainers of existing applications with no way to adopt a Harness without starting over. The skill at [SKILL.md](../../skills/bootstrap-harness/SKILL.md) now inspects the repository and selects a starting path. A greenfield repository keeps the day-zero flow and its expectations. An existing application uses a lightweight inventory, interviews that separate discovered facts from maintainer decisions, and a staged plan the maintainer approves before anything in the application, its tests, or its tooling changes. Both paths use the same Gate Contracts; a Gate is adopted only when it actually runs under the approved scope and cadence and has its Gate Proof, and otherwise stays pending or blocked.

## Considered Options

- **A second adoption skill**: rejected because it would duplicate the Gate Contracts and let their obligations drift.
- **Keeping the day-zero-only rejection**: rejected because it prevents adoption in the applications that need it most.
- **Rewriting or restructuring the application during adoption**: rejected because adoption must preserve observed behavior, existing boundaries, and working tools.

## Decision

Add the adoption path to the existing skill, share the Gate Contracts between both paths, and let the maintainer approve the staged plan before any application, test, or tooling change. The approved Gate states are the honest account of what runs; the plan is a stage record, not a competing source of current policy.
