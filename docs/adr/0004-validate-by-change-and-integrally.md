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

The full [Entry Point](../../GLOSSARY.md#entry-point) has two modes. Validation by change selects checks and scopes deterministically from versioned [selection policy](../../GLOSSARY.md#selection-policy): changed files plus their dependents, widened on shared configuration or dependency changes and on impact that cannot be established. Integral validation runs every Gate over its whole input, including checks policy assigns to periodic execution. Each project approves a [validation budget](../../GLOSSARY.md#validation-budget); required validation wider than it is [inconclusive](../../GLOSSARY.md#inconclusive-result) and non-zero, starts nothing, and names the decision needed to proceed. Results report executed checks and scopes, non-applicable checks, periodic checks with their last integral result, failures and inconclusive outcomes distinctly, and a green [validation-by-change](../../GLOSSARY.md#validation-by-change) result never claims integral verification. Periodic failures stay visible and affect work in their scope; independence is established, not assumed. Guides name the Entry Points and their modes, never a per-check command catalogue, because the check list, impacts, scopes, cadence and budget are executable policy. The Stage Example realizes the modes and rehearses them on a disposable copy with a controlled budget fixture; see [SKILL.md](../../skills/bootstrap-harness/SKILL.md) phase 5 and [GATE-CONTRACTS.md](../../skills/bootstrap-harness/GATE-CONTRACTS.md#execution-modes).
