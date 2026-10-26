# Validate by change, and integrally under the approved cadence

## Context

The full Entry Point ran every Gate over the whole application on every change. That suits a small service but not a large one, and shortening the run by guessing which checks matter would make a green result mean less than it says. The skill now requires the two modes; the decision here is how this stack realizes them.

## Decision

`make check` is validation by change and `make check MODE=integral` is integral validation. The check list, each check's impact, scope and cost, the validation budget and the periodic cadence live in [harness/policy.json](../../harness/policy.json), which [scripts/run-mode.mjs](../../scripts/run-mode.mjs) executes. Selection includes the files that depend on a change, widens on shared configuration or dependency changes and on any impact the graph cannot place, and a required validation wider than the budget exits non-zero and inconclusive without starting a check. The whole-codebase mutation is a periodic check: validation by change reports it and integral validation runs it. A change in a failed periodic check's scope is not reported green, an independent change proceeds with the failure reported, and an uncertain relationship widens. [scripts/rehearse-validation.mjs](../../scripts/rehearse-validation.mjs) demonstrates all of this on a disposable copy with a controlled budget fixture; its transcript is run output and is not committed.

## Consequences

A green change result now states a scope instead of implying whole-application verification, and the cost of a change follows its impact where the dependency graph is reliable. The budget and periodic cadence are reviewable policy values: changing them is a reviewed change, not a local flag. A widened run costs more than the reduced one, which is why the budget exists; the rehearsal's fixture is small, so it demonstrates the policy rather than the duration on an immense application, which each adoption measures against its own agreed budget. Guides name the modes and point at the policy; they never list the checks or their commands.
