# Testing strategy

## Intent

- **Unit test**: a domain module through its public functions, with no I/O and no test doubles. It runs offline in milliseconds.
- **Integration test**: a context driven against a real Postgres started in an ephemeral container, with the real adapter and the real SQL. The only substitutes are third-party systems at the boundary, and there are none here.

The levels exist to localise failure: a red unit test points at a rule, a red integration test at a query.

## Deferred: the e2e level

TODO: this tree has no e2e level. Its tests will be rewritten in Cucumber/Gherkin after a reanalysis of product and architecture, so writing them in the current runner would leave work here that is known to be replaced. Until that reanalysis lands, the E2E Gate Contract has no Gate here and therefore no Gate Proof, and the full Entry Point runs thirteen Gates rather than fourteen. The build target still produces the artifact that level will drive, and `src/main.ts` still reports its listening port as the readiness signal it will wait for.

## Judgment

Test a new rule at the unit level; test a new query or mapping at the integration level. Do not test the same behaviour at both levels. Never replace a database with a fake: the adapter is the thing under test, and its SQL is where the defects are. A test double is acceptable only for a third-party system that cannot run locally.

The Mutation Gate treats the unit level as the proof that rules are pinned down, so a new domain rule needs unit tests that fail when the rule is wrong. The mutation scope stops at domain models deliberately; see [ADR 0002](../adr/0002-mutate-domain-models-only.md).

## Pointers

- Unit tests: `src/**/domain/*.test.ts`
- Integration tests: `src/**/*.integration.test.ts`
- Container harness: `test/support/postgres.ts`
- Mutation scope and reporters: `stryker.config.mjs`
- Mutation thresholds and changed-set base: `scripts/check-mutation.mjs`
