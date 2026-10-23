# Library Lending example

The smallest thing that is a library lending service: an HTTP service on Postgres with a core **Lending** context and a supporting **Catalog** context, built to demonstrate the Gate Contracts from `bootstrap-harness`. It implements thirteen of the fourteen Contracts; the e2e level is deferred pending a rewrite in Cucumber/Gherkin (see [ADR 0003](docs/adr/0003-defer-the-e2e-level.md)).

This is a Stack Example, not a supported product.

- [AGENTS.md](AGENTS.md) is the index every agent reads first.
- [INTERVIEW-ANSWERS.md](INTERVIEW-ANSWERS.md) records the fixed interview answers this example was generated from, so the run can be repeated.
- [GATE-PROOFS.md](GATE-PROOFS.md) records the Gate Proof for every Gate, and why one Contract has none.
- [SKILL-FEEDBACK.md](SKILL-FEEDBACK.md) records what generating this example exposed in the skill.
