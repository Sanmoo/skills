# Coding standards

## Judgment

- Name types, functions, variables, and tables after [GLOSSARY.md](../../GLOSSARY.md) terms; a term under `_Avoid_` fails the Avoided terms Gate.
- Prefer one deep module behind a small interface over several shallow ones. `src/catalog/index.ts` and `src/lending/index.ts` are the only public interfaces of their contexts.
- Inside a context, put domain rules in `domain/`, use cases in `application/`, and database code in `adapters/`. Domain modules import only their own domain files.
- Let errors carry meaning: a domain error type per failure the HTTP edge must translate, never a string comparison.
- Keep functions under the complexity limit by extracting named decisions, not by nesting conditions.

## Pointers

- Formatting: `.prettierrc.json`
- Lint rules: `eslint.config.mjs`
- Complexity rule and limit: `eslint.metrics.config.mjs`
- Type strictness: `tsconfig.json`
