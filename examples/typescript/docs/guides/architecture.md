# Architecture

## Intent

The service is a modular monolith with one module per bounded context under `src/`: one deployable, so a change across contexts is one change, and one module per context, so each model keeps its own language. A boundary is cheap to split later and costly to merge, which is why there are only two contexts.

Boundaries are enforced rather than trusted. A boundary that only a reviewer guards erodes one convenient import at a time; the Context boundaries and Dependency rule Gates make the erosion fail instead.

- A context exposes itself only through its public interface, `src/catalog/index.ts` or `src/lending/index.ts`. Everything else in it is private.
- A context may depend only on the contexts the context map declares, and the declared graph is acyclic.
- A domain model imports nothing but its own domain: no adapter, application service, delivery code, framework, or database client. Its application layer orchestrates it; its adapters connect it to infrastructure.
- `src/http/` and `src/main.ts` are the delivery root, not a context: they compose the contexts' public interfaces and nothing deeper.

## Judgment

- A new concept belongs in an existing context when it is defined in that context's glossary language and changes for the same reasons as that context's model. When the same word starts to mean two things, or a concept needs its own lifecycle and language, propose a new context.
- A new context, or a new dependency between contexts, is a change to the context map: make it there first and say why in the change.
- Prefer passing what a context needs from another through a narrow port typed from the other context's public interface, as Lending does with the Catalog.
- Open an ADR when a decision is hard to reverse, surprising without its context, and the result of a real trade-off, such as giving a context its own database or splitting a context into a service.

## Pointers

- The context map, with the core context: [.dependency-cruiser.contexts.cjs](../../.dependency-cruiser.contexts.cjs).
- Context boundaries Gate config: [.dependency-cruiser.boundaries.cjs](../../.dependency-cruiser.boundaries.cjs).
- Dependency rule Gate config: [.dependency-cruiser.domain.cjs](../../.dependency-cruiser.domain.cjs).
- The core-context mutation threshold: [harness/mutation.json](../../harness/mutation.json).
- Why one Postgres serves both contexts: [ADR 0001](../adr/0001-schema-per-context.md).
