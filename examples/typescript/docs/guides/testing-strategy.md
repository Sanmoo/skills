# Testing strategy

## Intent

Three levels, each with its own obligation:

- **Unit** tests pin down a context's domain model through its public functions. They perform no I/O and replace nothing this project owns. They live beside the module they test, as `src/**/*.test.ts`.
- **Integration** tests prove a context works with its real infrastructure: each adapter and application service runs against a real Postgres in an ephemeral container, and the delivery routes run against the real contexts. Test doubles stand in only for third-party systems, at the context's boundary. They live beside the module they test, as `src/**/*.integration.test.ts`.
- **E2E** scenarios prove the service works as it ships. They are Gherkin feature files in English, the language the business reviewer reads, written in the glossary's terms. Each scenario drives the built service, started as its own process against a real Postgres, over HTTP, and waits for the line the service prints when it listens instead of sleeping. Together the scenarios reach every context.

## Judgment

- Test a new rule of the domain at the unit level, a new query or mapping at the integration level, and a new route at the integration level too. Add an e2e scenario only for a business journey a reviewer would recognize, when it adds evidence about the shipped artifact and the connections between components; a protocol detail such as a status code stays at the integration level.
- Keep scenarios about the business goal, its conditions, and the observable outcome. Requests, status codes, payloads, and ids belong in the step definitions.
- A business reviewer approves a new or changed scenario before its step definitions are written. A green e2e run proves the service behaves as the scenarios say, not that they say the right thing.
- Before changing behavior that already exists and that no test pins down, write a regression test that records what it does today. That test records observed behavior; it is not an audit of whether the behavior is right.
- A test double for something this project owns hides the integration it should prove. Use the real context or adapter instead.

## Pointers

- Test runner config, for unit and integration: [vitest.config.ts](../../vitest.config.ts); the Postgres container: [test/support/postgres.ts](../../test/support/postgres.ts).
- Scenarios: [features/library_lending.feature](../../features/library_lending.feature); step definitions: [features/step_definitions/](../../features/step_definitions/); how the service is started: [features/support/service.ts](../../features/support/service.ts).
- Gherkin executor config: [cucumber.mjs](../../cucumber.mjs), and the wrapper that refuses a run without scenarios: [scripts/run-e2e.mjs](../../scripts/run-e2e.mjs).
- Mutation config: [stryker.config.mjs](../../stryker.config.mjs) and its thresholds: [harness/mutation.json](../../harness/mutation.json).
