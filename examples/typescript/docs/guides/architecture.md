# Architecture

## Intent

The system is a modular monolith: one process, one deployable, one module per bounded context. **Lending** (core) and **Catalog** (supporting) each own their model, their language, and their storage schema. The service is small enough that a network boundary between the contexts would buy nothing, and a monolith keeps the whole change reviewable in one place.

Boundaries are enforced, not trusted. The compiler cannot see a context boundary, so two Gates describe the map and check every import. Enforcement is what lets the modules be split into services later without archaeology; a boundary that only exists in a diagram has already been violated.

## Judgment

Put a concept in an existing context when the context already owns the decision it drives. Open a new context only when the concept needs a model of its own and its language conflicts with the existing one; a boundary is cheap to split later and costly to merge. Lending calls Catalog through `src/catalog/index.ts` and nothing else; adding another edge means changing the context map in code first.

Open an ADR when a decision is hard to reverse, surprising without context, and the result of a real trade-off. Schema ownership and mutation scope are examples in `docs/adr/`.

## Pointers

- Context map and the imports it allows: `scripts/check-boundaries.mjs`
- Domain isolation from delivery and storage: `scripts/check-dependency-rule.mjs`
- Mutation thresholds per context: `scripts/check-mutation.mjs`
