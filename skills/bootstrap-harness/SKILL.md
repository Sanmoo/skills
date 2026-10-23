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

**Done when** the user has confirmed every subdomain with its kind (core, supporting, generic), every bounded context with its subdomain, the allowed dependencies between contexts, and the glossary terms of each context, and the answers are recorded.

## 3. Interview the stack

Read [GATE-CONTRACTS.md](GATE-CONTRACTS.md), then run the stack interview in [INTERVIEW.md](INTERVIEW.md), section _Stack_. Add the confirmed answers to `INTERVIEW-ANSWERS.md`, including the tool and version chosen for every Gate.

**Done when** the user has confirmed the language and runtime, the deliverable type and its outermost edge, the infrastructure of each context, one pinned tool for every Gate Contract, the Entry Point mechanism, the CI provider, and any threshold that departs from the defaults, and the stack answers are recorded.

## 4. Build the Walking Skeleton

Shape the code as a modular monolith with one module per bounded context, named as in the glossary. Any other shape requires an ADR the user approved during the interviews.

In each context, build one trivial operation that a request through the outermost edge reaches. Give each context the infrastructure adapter it needs, and keep its domain model free of infrastructure and framework imports. Expose each context to others only through a public interface.

Write the first tests at every level defined in [GATE-CONTRACTS.md](GATE-CONTRACTS.md): unit tests for each context's domain model, integration tests for each adapter against real infrastructure, and e2e tests that reach every context through the outermost edge.

**Done when** the deliverable builds and runs, and the e2e tests reach every context and pass.

## 5. Wire the Gates

Implement every Gate in [GATE-CONTRACTS.md](GATE-CONTRACTS.md) with the tools confirmed in phase 3, versions pinned and thresholds in versioned config. Expose them through the two Entry Points: the full one runs every Gate, the fast one runs the Gates marked fast. Make CI call the full Entry Point and nothing else, and make the pre-commit hook call the fast one. Make the CI checkout give each Gate what it measures: the history a history scan covers, and a base branch the changed-set comparison can resolve.

**Done when** every Gate Contract has a Gate and the full Entry Point is green.

## 6. Write the Guides

Write the Guides as described in [GUIDES.md](GUIDES.md).

**Done when** every file in the GUIDES.md inventory exists and the full Entry Point, including the Guide pointer Gate, is green.

## 7. Prove every Gate

Run a **Gate Proof** for each Gate, one at a time: introduce the smallest violation that Gate exists to catch, run the Entry Point of its tier, confirm it goes red _because of that Gate_, then revert the violation. GATE-CONTRACTS.md suggests a violation for each Gate. Keep the violations in an executable proof file so the proofs can be repeated, and keep that file out of both Entry Points. Record the result in `GATE-PROOFS.md`: one row per Gate with its tier, tool and version, the violation, and the outcome. When a Gate Contract is deliberately not wired - because its stack choice is still open, for example - record that in `GATE-PROOFS.md` with the reason instead of a row, so a missing row is never read as an oversight.

**Done when** every Gate has been seen red for its own reason, or recorded as deliberately deferred with its reason, `GATE-PROOFS.md` records which, and the full Entry Point is green on the final tree.

## Blocked Gates

Every Gate in the Gate Floor runs before the Harness counts as established. When the environment cannot run one, stop at that phase and report the blocker and what the user must provide. Blockers include a missing container runtime, no network for the vulnerability database, and a host binary a Gate shells out to; check what each tool needs before starting phase 7. The run resumes from that phase once the blocker is cleared.

## Final report

Report to the user:

- the subdomains and bounded contexts;
- a table of Gate, tool and version, tier, and Gate Proof result;
- the ADRs written;
- any blocker that remains.

## Stack Examples

Non-normative realizations of the Gate Contracts for specific stacks live in <https://github.com/Sanmoo/skills/tree/main/examples>. When one matches the chosen stack, consult it for how a Gate looks when done well; the TypeScript example also records its [interview answers](../../examples/typescript/INTERVIEW-ANSWERS.md), [Gate Proofs](../../examples/typescript/GATE-PROOFS.md), and [what generating it exposed in this skill](../../examples/typescript/SKILL-FEEDBACK.md). The Gate Contracts remain the authority.
