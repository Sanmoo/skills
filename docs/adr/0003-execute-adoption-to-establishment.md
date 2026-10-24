# Execute approved adoption plans to an established Harness

## Context

The adoption path introduced by [ADR 0002](0002-adoption-path.md) stopped at the maintainer's approval in [SKILL.md](../../skills/bootstrap-harness/SKILL.md), leaving the execution of the approved plan, the state each stage reports, and the test for an established Harness outside the skill. The Gate Contracts already required a Gate to run under the approved scope and cadence and to have its Gate Proof, but the workflow did not say how an approved plan reaches that state.

## Considered Options

- **End at approval**: rejected because [SKILL.md](../../skills/bootstrap-harness/SKILL.md) is the whole procedure, and a plan nobody executes establishes nothing.
- **Count a configured or green Gate as adopted**: rejected because a check can pass without exercising its Contract, and a scope the maintainer did not approve is not protection.
- **Require debt elimination before establishment**: rejected because it would make adoption a rewrite and contradict the premise that observed behavior is the regression contract.

## Decision

The skill now executes the approved plan stage by stage: it retains tools and checks that satisfy their Contract under the approved adoption criteria, proposes replacements with a reason and makes them only with approval, and gives every adopted Gate a repeatable proof whose violation lies outside the accepted tolerance. Each stage reports its Gates as adopted, pending, or blocked, and the Harness counts as established only when every Gate in the Gate Floor is adopted that way. Debt the criteria accept does not prevent establishment; a pending, blocked, or vacuously passing Gate does, and no Walking Skeleton replaces the existing application. ADR 0002 remains in force; this ADR extends it with execution and establishment, and the Gate Proof record is committed run history, not a Guide or a source of current policy.
