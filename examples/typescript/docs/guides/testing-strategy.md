# Testing strategy

## Intent

- **Unit test**: a domain module through its public functions, with no I/O and no test doubles. It runs offline in milliseconds.
- **Integration test**: a context driven against a real Postgres started in an ephemeral container, with the real adapter and the real SQL. The only substitutes are third-party systems at the boundary, and there are none here.
- **E2E test**: an English Gherkin scenario, executed directly by `@cucumber/cucumber`, that drives the built service as its own process over HTTP against real Postgres. The scenario states the business goal, its preconditions, and the observable outcome in [GLOSSARY.md](../../GLOSSARY.md) terms; HTTP requests, routes, and status codes stay in the step definitions. The full Entry Point builds the artifact before this level runs, and the level waits for the listening-port readiness line instead of sleeping.

The levels exist to localise failure: a red unit test points at a rule, a red integration test at a query, a red e2e scenario at the shipped deliverable or the connection between contexts.

## Judgment

Test a new rule at the unit level; test a new query or mapping at the integration level. Do not test the same behaviour at both levels. Never replace a database with a fake: the adapter is the thing under test, and its SQL is where the defects are. A test double is acceptable only for a third-party system that cannot run locally.

Put a behaviour in the e2e portfolio when the journey proves the built artifact, the connection between contexts, and the public edge. A journey may traverse behaviour already covered at a lower level when it adds that evidence; do not copy the integration matrix, and keep a protocol-only check at the integration level where it adds no business review.

A business reviewer approves the scenario set for meaning before its step definitions are written. A green run proves that the approved scenarios execute, not that they say the right thing. Scenarios are independent: each one starts from empty schemas and reaches the service through HTTP, never through application services, domain objects, or repositories. The reset that empties those schemas belongs to the Postgres harness; it is test infrastructure, not a context dependency.

The Mutation Gate treats the unit level as the proof that rules are pinned down, so a new domain rule needs unit tests that fail when the rule is wrong. The mutation scope stops at domain models deliberately; see [ADR 0002](../adr/0002-mutate-domain-models-only.md).

The Mutation Gate's own selection is part of what has to keep working, so it is checked at its executable boundary in `test/harness/`, and the proof runner's evidence bookkeeping in `test/proofs/`; both run with the proof job and never inside an Entry Point. Those checks are not a level of the application: they are the Harness's guard against a selection that silently stops matching, and [the selection code](../../scripts/check-mutation.mjs) owns what they must establish.

The full Entry Point's two modes decide which levels a change pays for. Validation by change selects the test files whose source is affected, dependents included, and reports the levels that did not apply; a green result covers that scope only, not the whole application. Integral validation runs every level over its whole input, including the checks assigned to periodic execution. Which check runs, over which scope, at which cadence and under which budget is versioned policy, not a rule in this Guide.

## Pointers

- Unit tests: `src/**/domain/*.test.ts`
- Integration tests: `src/**/*.integration.test.ts`
- E2E scenarios: `features/**/*.feature`
- E2E steps and lifecycle: `features/step_definitions/`, `features/support/`
- Cucumber configuration: `cucumber.mjs`
- Empty-suite guard: `scripts/run-e2e.mjs`
- Compiled-service lifecycle: `test/support/service.ts`
- Container harness: `test/support/postgres.ts`
- Mutation scope and reporters: `stryker.config.mjs`
- Mutation thresholds, changed-set base, and proof scope: `scripts/check-mutation.mjs`
- Gate Proof declarations and their declared scope: `scripts/gate-proofs.mjs`
- Mutation selection checks: `test/harness/`
- Gate Proof evidence checks: `test/proofs/`
- Selection policy: check list, impacts, scopes, costs, budget and periodic cadence: `harness/policy.json`
- The full Entry Point's two modes: `scripts/run-mode.mjs`
- Changed set and affected dependents: `scripts/selection.mjs`
- Modes' rehearsal on a disposable copy: `scripts/rehearse-validation.mjs`
