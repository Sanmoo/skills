# One Postgres database, one schema per context

Lending and Catalog both persist to the same Postgres instance, but each context owns a schema of its own: `lending.loans` and `catalog.books`. A context's adapter migrates and queries only its own schema, and no context joins across the boundary.

## Context

At day zero a single instance keeps the example runnable with one container and one connection string. Separate schemas keep the ownership rule visible: a cross-context join becomes an obvious violation rather than an accidental convenience.

## Decision

Use one database and one schema per bounded context; cross-context reads go through the callee's public interface.

## Consequences

A future split into one database per context changes connection configuration and migration wiring, but not the domain code or the SQL inside each adapter. Reporting that needs both contexts must compose public interfaces instead of joining tables.
