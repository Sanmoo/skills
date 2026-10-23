# Defer the e2e level to a Cucumber/Gherkin rewrite

This tree has no e2e level and therefore no e2e Gate: its tests will be written in Cucumber/Gherkin after a reanalysis of product and architecture, so writing them in the current runner first would leave work here that is known to be replaced. The follow-up is tracked as [Sanmoo/skills#7](https://github.com/Sanmoo/skills/issues/7).

## Context

The level existed, in Vitest, driving the built service over HTTP against a real Postgres. It was readable but not in the language of the business, and the choice of runner for that level is a product decision rather than a stack detail: the reviewer wants the level to be reviewable by people who do not read TypeScript. Between removing it and rewriting it, removing is the honest state, because the rewrite is known to happen and the intermediate form is known to be thrown away.

## Decision

Remove the level from this tree: test, runner project, Entry Point step, Gate Proof and Gate Proof row. Everything else in the Harness stays as it was, and the E2E Gate Contract stays in the skill: this is a deferral of one Gate, not a change to the floor. [ADR 0002](0002-mutate-domain-models-only.md) is left as written; its context still names the e2e level, and the mutation scope it decides does not depend on this one.

## Consequences

- The E2E Gate Contract has no Gate here, so the full Entry Point runs thirteen Gates rather than fourteen, and the Gate Proof for that Contract is missing until the level returns.
- The routes and the 404/405 split in `src/http/server.ts` are reached by no Gate until then, and the build target is on no Entry Point, so the artifact is produced only by hand. The readiness signal a returning level will wait for stays where it is: `src/main.ts` reports its listening port.
- The stack answer for the level is reopened rather than answered: whether the Gherkin runner is `@cucumber/cucumber` or layered over Vitest, and whether the interview should offer Cucumber/Gherkin as a stack answer, are the reanalysis's to decide.
