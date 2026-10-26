# Library Lending example

The smallest thing that is a library lending service: an HTTP service on Postgres with a core **Lending** context and a supporting **Catalog** context, built to demonstrate the Gate Contracts from `bootstrap-harness`. Its full Gate Floor includes English Gherkin E2E scenarios, run directly by Cucumber against the built service on real Postgres; see [ADR 0005](docs/adr/0005-restore-the-e2e-level-with-cucumber.md). Its full Entry Point has the two validation modes: validation by change selects the checks and scopes an affected change needs, and integral validation runs every Gate over its whole input; the selection policy, budget and periodic cadence live in [harness/policy.json](harness/policy.json), and [ADR 0006](docs/adr/0006-validation-modes.md) records the decision.

This is a Stack Example, not a supported product.

- [AGENTS.md](AGENTS.md) is the index every agent reads first.
- [INTERVIEW-ANSWERS.md](INTERVIEW-ANSWERS.md) records the fixed interview answers this example was generated from, so the run can be repeated.
- [GATE-PROOFS.md](GATE-PROOFS.md) records the Gate Proof for every Gate and how to obtain a run's evidence, and the rehearsal of the two validation modes.
- [SKILL-FEEDBACK.md](SKILL-FEEDBACK.md) records what generating this example exposed in the skill.
