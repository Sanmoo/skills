# Restore the e2e level with Cucumber and English Gherkin

[ADR 0004](0004-defer-the-e2e-level-under-the-universal-rule.md) carried this tree's e2e deferral under the universal Gherkin rule. [Sanmoo/skills#7](https://github.com/Sanmoo/skills/issues/7) applies that rule here: the level returns as English Gherkin scenarios executed directly by `@cucumber/cucumber`, driving the built service over HTTP against real Postgres.

## Context

The e2e level was removed in [#5](https://github.com/Sanmoo/skills/issues/5) while the runner and the product decisions were reopened. The earlier level was readable but technical: it expressed requests and status codes rather than business journeys. [Sanmoo/skills#6](https://github.com/Sanmoo/skills/issues/6) then settled that every e2e level is executable Gherkin in business language, with the executor chosen by the stack and the scenario language chosen by the domain interview. This tree chose English and approved two journeys before any step definition was written.

## Decision

Restore the E2E Gate in the full Entry Point:

- Cucumber executes the feature scenarios directly; TypeScript step definitions are loaded through the pinned `tsx` dependency. There is no Gherkin-over-Vitest layer.
- The full Entry Point builds the deliverable before E2E runs, and the E2E level starts `dist/main.js` as a separate process against a real Postgres container. It waits for the listening-port readiness line, then drives the service only through HTTP.
- Each scenario starts from empty schemas, so scenario data and order do not couple journeys. Teardown stops the service and the container on success and failure.
- Cucumber runs in strict mode, and a wrapper fails a run that selects no scenarios; both are required because Cucumber treats an empty suite as success.
- Vitest keeps its unit and integration projects. Mutation stays scoped to the domain models.
- [ADR 0004](0004-defer-the-e2e-level-under-the-universal-rule.md) is marked superseded by this record.

## Consequences

- The full Entry Point runs fourteen Gates again, and the build plus the routes in `src/http/server.ts` are reached by a Gate.
- The e2e portfolio is the two approved journeys, not a copy of the integration matrix. It adds evidence about the built artifact, the connection from Lending to Catalog, and the public edge.
- The e2e Gate needs Docker and a Postgres image, so it stays out of the offline fast Entry Point.
- A scenario's business meaning remains a human review; a green run only proves that the approved scenarios execute.
