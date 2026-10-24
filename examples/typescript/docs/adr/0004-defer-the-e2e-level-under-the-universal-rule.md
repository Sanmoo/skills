# Defer the e2e level under the universal Gherkin rule

[ADR 0003](0003-defer-the-e2e-level.md) deferred this tree's e2e level and left open whether the interview should offer Gherkin at all. [Sanmoo/skills#6](https://github.com/Sanmoo/skills/issues/6) settles that for every stack: the e2e level is executable Gherkin in business language, the executor is chosen and pinned in the stack interview, and the scenario language is settled in the domain interview. This tree still has no e2e level, so the deferral stays until [#7](https://github.com/Sanmoo/skills/issues/7) realizes the rule.

## Context

The universal contract changed after ADR 0003 was accepted: Gherkin is no longer an option the reanalysis may decline, it is the required form of every e2e level, and only the executor is the stack's choice. The level itself stays absent, the build stays outside the Entry Points, and the full Entry Point runs thirteen Gates, so this record carries the same deferral under the new rule rather than amending the original.

## Decision

Keep the e2e level deferred to #7 under the universal rule. Mark [ADR 0003](0003-defer-the-e2e-level.md) superseded: this record restates its deferral decision and replaces its reopened runner question, and #7 replaces this record when the level returns.

## Consequences

- The level, its build step, its Gate Proof and the interview answers the rule asks for remain #7's work.
- Until #7 lands, the routes in `src/http/server.ts` are still reached by no Gate and the artifact is still produced only by hand.
- The scenario language, the executor and the approved business scenarios are recorded with the interview answers when #7 applies the rule.
