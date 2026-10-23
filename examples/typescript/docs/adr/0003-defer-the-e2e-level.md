# Defer the e2e level to a Cucumber/Gherkin rewrite

This tree has no e2e level and therefore no e2e Gate: its tests will be written in Cucumber/Gherkin after a reanalysis of product and architecture, so writing them in the current runner first would leave work here that is known to be replaced. The follow-up is tracked as [Sanmoo/skills#7](https://github.com/Sanmoo/skills/issues/7).

## Context

The level existed in Vitest, driving the built service over HTTP against a real Postgres: readable, but not in the language of the business, and the choice of runner for that level is a product decision rather than a stack detail. Between an intermediate form that will be thrown away and no level at all, removing it is the honest state.

## Decision

Remove the level from this tree: test, runner project, Entry Point step, Gate Proof and Gate Proof row. The E2E Gate Contract stays in the skill and the rest of the Harness is unchanged, so this defers one Gate rather than lowering the floor. [ADR 0002](0002-mutate-domain-models-only.md) stays as written even though its summary and its Decision still name the e2e level; the mutation scope it decides does not depend on this one.

## Consequences

- The full Entry Point runs thirteen Gates rather than fourteen, and the Gate Proof for the E2E Contract is missing until the level returns.
- The routes and the 404/405 split in `src/http/server.ts` are reached by no Gate, and the build target is on no Entry Point, so the artifact is produced only by hand. The readiness signal stays where a returning level will look for it: `src/main.ts` reports its listening port.
- The stack answer for the level is reopened: whether the Gherkin runner is `@cucumber/cucumber` or layered over Vitest, and whether the interview should offer Cucumber/Gherkin at all, are the reanalysis's to decide.
