# Coding standards

Lint, the formatter, and the static metrics hold the rules a tool can check. These are the ones it cannot.

## Judgment

- Name types, functions, and variables after [GLOSSARY.md](../../GLOSSARY.md) terms: a `Loan`, a `Borrower`, a `dueDate`. When the glossary has no term for a concept, settle the term there before naming the code.
- Prefer one deep module behind a small interface over several shallow ones. A context's public interface, such as `src/lending/index.ts`, exports what other modules use and hides how it is done.
- Within a context, put a rule about the domain in its `domain` directory (as in `src/lending/domain/`), an orchestration of domain operations and ports in `application`, and anything that talks to infrastructure in `adapters`. When a piece of code fits none of them, it probably belongs to the delivery root or to another context.
- Express a domain refusal as a named error class in the domain, and let the delivery root map it to its protocol. The domain does not know about status codes.
- Keep the composition root small and declarative: it wires the contexts, it does not decide anything.

## Pointers

- Formatter: [.prettierrc.json](../../.prettierrc.json) and [.prettierignore](../../.prettierignore).
- Linter: [eslint.config.mjs](../../eslint.config.mjs).
- Static metrics: [eslint.metrics.config.mjs](../../eslint.metrics.config.mjs) (complexity), [.dependency-cruiser.cycles.cjs](../../.dependency-cruiser.cycles.cjs) (cycles), and [.jscpd.json](../../.jscpd.json) (duplication).
