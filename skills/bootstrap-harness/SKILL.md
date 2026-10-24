---
name: bootstrap-harness
description: Establish a day-zero engineering Harness (agent-oriented Guides plus deterministic Gates, shaped by strategic DDD) in a greenfield repository, for any stack.
disable-model-invocation: true
---

# Bootstrap Harness

Establish a **Harness** in a greenfield repository: **Guides** that steer every change before it is made, and **Gates** that deterministically pass or fail it afterwards. The skill applies to any stack.

One principle governs every phase: **the code is the source of truth**, Gate configuration included. A Guide holds only what code cannot express (intent and rationale, judgment rules no Gate can verify, and pointers into the code). Thresholds, context lists, and commands live in code, and Guides point at them. The glossary is the one document with authority over the code, and only over naming.

Work the phases in order. Start a phase only when the previous one meets its completion criterion.

## 1. Confirm greenfield

Inspect the repository. It is greenfield when it holds no application source code: at most a README, license, ignore files, and editor or tooling config.

If application code exists, tell the user this skill establishes a Harness from day zero only, and end the run.

**Done when** the repository is confirmed greenfield, or the user has been told and the run has ended.

## 2. Interview the domain

Run the domain interview in [INTERVIEW.md](INTERVIEW.md), section _Domain_, and write `GLOSSARY.md` as terms resolve. Record every confirmed answer, numbered as in the interview, in `INTERVIEW-ANSWERS.md` beside it, so the same project can be regenerated and reviewed.

**Done when** the user has confirmed every subdomain with its kind (core, supporting, generic), every bounded context with its subdomain, the allowed dependencies between contexts, the glossary terms of each context, the scenario language, and the initial business scenarios, and the answers are recorded.

## 3. Interview the stack

Read [GATE-CONTRACTS.md](GATE-CONTRACTS.md), then run the stack interview in [INTERVIEW.md](INTERVIEW.md), section _Stack_. Add the confirmed answers to `INTERVIEW-ANSWERS.md`, including the tool and version chosen for every Gate.

**Done when** the user has confirmed the language and runtime, the deliverable type and its outermost edge, the infrastructure of each context, one pinned tool for every Gate Contract including the executor that runs the Gherkin scenarios, the Entry Point mechanism, the CI provider, and any threshold that departs from the defaults, and the stack answers are recorded.

## 4. Build the Walking Skeleton

Shape the code as a modular monolith with one module per bounded context, named as in the glossary. Any other shape requires an ADR the user approved during the interviews.

In each context, build one trivial operation that a request through the outermost edge reaches. Give each context the infrastructure adapter it needs, and keep its domain model free of infrastructure and framework imports. Expose each context to others only through a public interface.

Write the first tests at every level defined in [GATE-CONTRACTS.md](GATE-CONTRACTS.md): unit tests for each context's domain model, integration tests for each adapter against real infrastructure, and e2e scenarios that reach every context through the outermost edge.

The e2e level starts from the scenarios the domain interview approved. Write them as Gherkin feature files in the confirmed scenario language, then the step definitions that drive the built artifact. The scenarios carry the business goal, the conditions, and the observable outcome; the step definitions carry the delivery mechanics. Keep the e2e portfolio to the few full journeys the Contract asks for.

**Done when** the deliverable builds and runs, and the approved e2e scenarios reach every context and pass against the built artifact.

## 5. Wire the Gates

Implement every Gate in [GATE-CONTRACTS.md](GATE-CONTRACTS.md) with the tools confirmed in phase 3, versions pinned and thresholds in versioned config. Expose them through the two Entry Points: the full one runs every Gate, the fast one runs the Gates marked fast. Make CI call the full Entry Point and nothing else, and make the pre-commit hook call the fast one. Make the CI checkout give each Gate what it measures: the history a history scan covers, and a base branch the changed-set comparison can resolve.

When wiring the e2e Gate, verify that its executor fails rather than passes on a wrong assertion and on each case the Contract's E2E section names: no scenarios, an undefined or pending step, and an artifact that does not start. A configuration that behaves otherwise does not satisfy the Contract.

**Done when** every Gate Contract has a Gate and the full Entry Point is green.

## 6. Write the Guides

Write the Guides as described in [GUIDES.md](GUIDES.md).

**Done when** every file in the GUIDES.md inventory exists and the full Entry Point, including the Guide pointer Gate, is green.

## 7. Prove every Gate

Run a **Gate Proof** for each Gate, one at a time: introduce the smallest violation that Gate exists to catch, run the Entry Point of its tier with only that violation present, confirm it goes red _because of that Gate_, then revert the violation before the next proof. One violation per run is what makes the result attributable: the Entry Point stops at the first Gate that fails, so several violations in one tree would leave several Gates red and no run could say which Gate caught which. GATE-CONTRACTS.md suggests a violation for each Gate. Keep the violations in an executable proof file so the proofs can be repeated, and keep that file out of both Entry Points. Record the result in `GATE-PROOFS.md`: one row per Gate with its tier, tool and version, the violation, and the outcome - and, for a changed-set Gate, the scope its proof declared, so the setup is disclosed beside the violation.

A Gate whose inputs are the files changed relative to a base can have no eligible input on the branch that carries its proof, and then a red result is impossible to obtain. Such a proof therefore declares, beside its violation, the smallest set of eligible files the violation needs, and for that one execution the declaration replaces the Gate's changed-set selection, through whatever mechanism the stack provides. The declaration is proof setup, not a second violation: no harmless source marker and no artificial comparison base, and the run stays the ordinary Entry Point with the Gate's own analysis and configured limits. GATE-CONTRACTS.md states what a declaration owes - an invalid input failing rather than widening, the scope bound to its run, both scopes recorded - and the proof runner is what enforces it. Ordinary changed-set discovery, its legitimate empty set included, keeps its own behavior and is checked separately, because an explicit-scope proof shows enforcement and Entry Point wiring rather than that Git-based selection still works.

**Done when** every Gate has been seen red for its own reason, `GATE-PROOFS.md` records it, and the full Entry Point is green on the final tree.

## Blocked Gates

Every Gate in the Gate Floor runs before the Harness counts as established. When the environment cannot run one, stop at that phase and report the blocker and what the user must provide. Blockers include a missing container runtime, no network for the vulnerability database, and a host binary a Gate shells out to; check what each tool needs before starting phase 7. The run resumes from that phase once the blocker is cleared.

## Final report

Report to the user:

- the subdomains and bounded contexts;
- a table of Gate, tool and version, tier, and Gate Proof result;
- the ADRs written;
- any blocker that remains.

## Stack Examples

Non-normative realizations of the Gate Contracts for specific stacks live in <https://github.com/Sanmoo/skills/tree/main/examples>. When one matches the chosen stack, consult it for how a Gate looks when done well; the TypeScript example also records its [interview answers](../../examples/typescript/INTERVIEW-ANSWERS.md), [Gate Proofs](../../examples/typescript/GATE-PROOFS.md), and [what generating it exposed in this skill](../../examples/typescript/SKILL-FEEDBACK.md). The Gate Contracts remain the authority. An example's Gherkin executor and scenario language are realizations for its stack, never rules for another: a universal obligation comes only from a Gate Contract.
