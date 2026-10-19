# Guides

A Guide steers a change before it is made. Because the code is the source of truth, a Guide holds exactly three kinds of content:

1. **Intent**: why a rule or structure exists, and which alternatives were rejected.
2. **Judgment**: rules a reviewer applies that no Gate can verify, such as "prefer one deep module over several shallow ones".
3. **Pointers**: relative links to the code or config that holds the facts.

Everything else lives in code, and the Guide links to it:

| Content | Where it lives |
|---|---|
| Thresholds and limits | the config file of the Gate that enforces them |
| The list of bounded contexts and their allowed dependencies | the module structure and the context boundaries Gate config |
| Formatting and lint rules | the formatter and linter config |
| Commands | the Entry Point definitions; Guides name only the two Entry Points |
| Tool versions | the lockfile and the version manager file |

Write each line as the behavior you want ("name types after glossary terms"), and keep only lines that change what an agent would do by default.

## Inventory

Create exactly these files in the target repository.

### `AGENTS.md`

The index every agent reads first, with `CLAUDE.md` as a symlink to it. Keep it short:

- one sentence on what the system is;
- the full and fast Entry Points, and the rule that a change is done only when the full Entry Point is green;
- the rule that the code is the source of truth: when a Guide and the code disagree, the code wins and the Guide gets fixed, except for naming, where `GLOSSARY.md` wins and the code gets fixed;
- a link to `GLOSSARY.md`, to each Guide, and to `docs/adr/`, each with one line on when to read it.

### `GLOSSARY.md`

Written during the domain interview, in the format given in [INTERVIEW.md](INTERVIEW.md).

### `docs/guides/architecture.md`

- Intent: why a modular monolith with one module per bounded context, and why boundaries are enforced rather than trusted.
- Judgment: how to decide whether a new concept belongs in an existing context or justifies a new one; when to open an ADR.
- Pointers: the context boundaries Gate config (the context map), the dependency rule Gate config, the core-context threshold config.

### `docs/guides/coding-standards.md`

- Judgment only: the rules lint cannot express (naming from the glossary, deep modules behind small interfaces, where a new piece of code belongs within a context).
- Pointers: the formatter, linter, and static metrics config.

### `docs/guides/testing-strategy.md`

- Intent: the definition of each test level (unit, integration, e2e), as in [GATE-CONTRACTS.md](GATE-CONTRACTS.md), stated for this project's stack and edge.
- Judgment: which level a new behavior is tested at; test doubles only for third-party systems at the boundary.
- Pointers: where each level's tests live, the mutation config with its thresholds.

### `docs/adr/`

One file per decision, numbered `0001-<slug>.md`, `0002-<slug>.md`, and so on. Each file holds a short title and one to three sentences of context, decision, and reason; add considered options only when the rejected alternatives are worth remembering. Write an ADR only when a decision is hard to reverse, surprising without context, and the result of a real trade-off. At bootstrap, the usual candidates are a shape other than a modular monolith, a missing type checker, and a threshold departure that meets all three criteria.

An accepted ADR stays as written. When a decision changes, write a new ADR and mark the old one `Superseded by ADR-NNNN`.
