# Library Lending

A small public library's lending service: an HTTP service with two bounded contexts, Lending (core) and Catalog (supporting), in one TypeScript modular monolith. It is also the TypeScript Stack Example of the [bootstrap-harness](../../skills/bootstrap-harness/SKILL.md) skill.

## Entry Points

- `make check` is the full Entry Point in its default mode, validation by change. It selects the checks and scopes a change affects, including the files that depend on it, and widens when shared configuration changes or the impact cannot be established. A green result covers the scope it reports and nothing more; it is never a claim that the whole project was verified.
- `make check MODE=integral` is integral validation: every check over its whole input, including the periodic ones validation by change only reports. A green result says every Gate ran over its whole input, on that tree at that moment.
- `make check-fast` runs the offline fast Gates. The pre-commit hook in [.githooks/pre-commit](.githooks/pre-commit) calls it.

A change is done only when `make check` is green. An inconclusive result is not green: it names the decision needed to proceed. Which checks exist, what each costs, which changes make each apply, the validation budget, and the periodic cadence are in [harness/policy.json](harness/policy.json).

## The code is the source of truth

When a Guide and the code disagree, the code wins and the Guide gets fixed. The exception is naming: [GLOSSARY.md](GLOSSARY.md) wins, and the code gets fixed.

## Read next

- [GLOSSARY.md](GLOSSARY.md): before naming anything, and before writing or reviewing a scenario.
- [docs/guides/architecture.md](docs/guides/architecture.md): before adding a module, a dependency between contexts, or a new context.
- [docs/guides/coding-standards.md](docs/guides/coding-standards.md): before writing code in a context.
- [docs/guides/testing-strategy.md](docs/guides/testing-strategy.md): before adding behavior, a test, or a scenario.
- [docs/adr/](docs/adr/): before reversing a structural decision; each ADR says why it was made.
