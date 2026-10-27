# Validate by change and integrally at an approved budget

## Context

The adoption path added in [ADR 0002](0002-adoption-path.md) let an existing application reach an established Harness, but it left every change paying for the whole Gate Floor over the whole application. On a very large codebase that is unaffordable, and skipping checks to fit a universal CI target would turn uncertainty into silence. [Sanmoo/skills#16](https://github.com/Sanmoo/skills/issues/16) asked for affordable validation whose results state what they verified.

## Considered Options

- **One cheaper whole-application run**: rejected because it still pays for every Gate on every change, and a shorter run would only mean weaker checks.
- **Let each Gate and directory decide for itself**: rejected because selection would stop being reproducible, affected dependents and shared configuration would be missed, and a green result would be ambiguous.
- **Exit green when the required validation is too expensive**: rejected because an unverified change would read as verified.
- **Run the expensive validation anyway**: rejected because the project did not approve that cost, and the maintainer loses the decision.
- **Run expensive checks only periodically and stop mentioning them**: rejected because a periodic check that leaves no trace is decorative, and a green change result would imply protection it does not have.

## Decision

The full [Entry Point](../../GLOSSARY.md#entry-point) has two modes: [validation by change](../../GLOSSARY.md#validation-by-change) and [integral validation](../../GLOSSARY.md#integral-validation). Their obligations - deterministic selection from versioned policy, dependents, widening, the project's [validation budget](../../GLOSSARY.md#validation-budget) and the [inconclusive](../../GLOSSARY.md#inconclusive-result) result, periodic execution and its failures, and the shape of a result - are stated once in [GATE-CONTRACTS.md](../../skills/bootstrap-harness/GATE-CONTRACTS.md#execution-modes) and referenced from the workflow in [SKILL.md](../../skills/bootstrap-harness/SKILL.md) phase 5. Guides name the Entry Points and their modes, never a per-check command catalogue, because the [selection policy](../../GLOSSARY.md#selection-policy) holds the check list, impacts, scopes, cadence and budget. The Stack Example realizes the modes and rehearses them on a disposable copy with a controlled budget fixture.
