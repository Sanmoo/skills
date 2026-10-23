# Mutate domain models only

The Mutation Gate mutates `src/lending/domain/` and `src/catalog/domain/` and nothing else. Adapters and application services are exercised by integration and e2e tests, which need a container; running them per mutant would make the Gate slow enough to be skipped.

## Context

A mutation score is only meaningful where a test level can kill the mutants cheaply. The domain rules are pure functions pinned by unit tests in milliseconds; the same mutant in an adapter triggers a container start per run.

## Decision

Stryker's `mutate` option lists the two domain directories. The adapters and use cases remain covered by the integration and e2e Gates, which are already required by the full Entry Point.

## Consequences

Coverage of adapter logic is judged by the integration level alone, so an adapter test must assert on observable results, not merely run the query. When a domain rule appears in a use case, extract it into the domain or it escapes mutation testing.
