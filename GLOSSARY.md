# Engineering Harness

The vocabulary for establishing an engineering Harness — the agent-oriented documents and deterministic checks that constrain every change to a codebase — on day zero of a greenfield project or through an approved adoption plan in an existing application, independent of technology stack.

## Language

**Harness**:
The complete set of Guides and Gates that constrains every change to a codebase, whether made by an agent or a human.
_Avoid_: Guardrails, scaffold

**Starting path**:
The path selected by inspecting the repository: **greenfield** or **existing application**. The greenfield path establishes the Harness from day zero; the adoption path reconciles it with an existing application.
_Avoid_: Repository type

**Greenfield**:
A repository with no application source code, no tests of application behavior, and no delivered behavior yet. The greenfield path establishes the Harness from day zero.
_Avoid_: New project, empty project

**Existing application**:
A repository that already contains application source, tests, delivered behavior, or application-specific tooling; the adoption path reconciles a Harness with it instead of generating a replacement. A repository with only tooling config and no application source, tests, or delivered behavior is greenfield.
_Avoid_: Brownfield, legacy application

**Legacy debt**:
The existing violations of the Gate Contracts an application already carries when adoption begins. Adoption records each one it accepts as a tolerated finding instead of requiring it to be fixed before establishment.
_Avoid_: Technical debt, Debt backlog

**Inventory**:
The lightweight, factual survey of an existing application made before any change. It records what the environment answers instead of asking, and leaves expensive analysis to later stages; the skill's inventory step lists what it covers.
_Avoid_: Functional audit, application assessment

**Observed behavior**:
The behavior an existing application exhibits today. It is the adoption path's regression contract: regression tests pin it down, and characterizing it is not an audit of its business correctness.
_Avoid_: Actual behavior, Runtime behavior

**Regression test**:
A test that records behavior the existing application already exhibits, including behavior that looks surprising but is stable, so a change that alters it fails instead of passing unnoticed. It characterizes what the application does today and is not an audit of whether that behavior is right.
_Avoid_: Characterization test, Golden test

**Interview answers**:
The file `INTERVIEW-ANSWERS.md` that records the confirmed answers to the domain, stack, or adoption interview so the run can be repeated and reviewed. It is a decision record, not a Guide or current policy.
_Avoid_: Questionnaire, survey responses

**Adoption plan**:
The staged, prioritized proposal for establishing the Harness in an existing application. The maintainer approves it before anything in the application, its tests, or its tooling changes; the approved plan is recorded as `ADOPTION-PLAN.md`, each stage adds its completion and Gate states to that record, and executing it adopts Gates stage by stage.
_Avoid_: Migration plan, rewrite plan

**Adoption criteria**:
The scope, cadence, and specific tolerated findings the maintainer approves for a Gate during adoption. They specialize the Gate Contract for this application and never replace or weaken it; a Gate that does not run under them, or that passes vacuously, is not adopted.
_Avoid_: Adoption rules, gate policy

**Tolerated finding**:
A specific violation the adoption criteria accept, recorded in its Gate's tolerance policy with its finding identity and matched one to one with a reported finding.
_Avoid_: Waiver, Allowlist entry

**Finding identity**:
The Gate, rule, location, and measured value or severity that identify one reported finding, so a Gate can match it to exactly one tolerance entry.
_Avoid_: Tolerance key, Suppression key

**Tolerance policy**:
The versioned Gate config that records tolerated findings, each entry recording one tolerated finding. It changes only by a reviewed change, no run regenerates it, and an entry the Gate no longer reports in the scope its run analyzed fails until that change updates it.
_Avoid_: Baseline snapshot, Suppression list

**Localized decision**:
The decision, limited to one observed behavior, that exceptionally strong evidence of an obvious error opens for the maintainer during adoption: fix it as its own reviewed change, or record the behavior as intended. It never corrects automatically, never stops unrelated adoption, and adds no owner or expiry.
_Avoid_: Risk acceptance, Bug triage

**Guide**:
An agent-oriented document in the Harness that steers a change before it is made, holding only what the code cannot express. The code, including the Gates, is always the source of truth; a Guide points to it rather than restating it.
_Avoid_: Guideline, instruction file

**Gate**:
A deterministic, executable check in the Harness that passes or fails a change after it is made.
_Avoid_: Quality gateway, sensor, guardrail

**Gate Contract**:
The stack-agnostic statement of a Gate's intent and acceptance criteria, which any stack must satisfy.
_Avoid_: Gate spec

**Gate Floor**:
The set of Gates every project must have, regardless of stack or subdomain.
_Avoid_: Minimum gates, baseline gates

**Gate state**:
The honest classification of every Gate: **adopted**, **pending**, or **blocked**. [GATE-CONTRACTS.md](skills/bootstrap-harness/GATE-CONTRACTS.md) holds the test for each; a pending or blocked Gate is not adopted, and neither is a Gate that passes vacuously.
_Avoid_: Gate status, gate maturity

**Gate Proof**:
The repeatable, attributable violation that shows a Gate turns the appropriate Entry Point red. It is required before that Gate counts as adopted, and its violation lies outside any tolerated finding the Gate's adoption criteria accept (the greenfield path accepts none).
_Avoid_: Smoke test

**Gate Proof record**:
The committed file, `GATE-PROOFS.md`, that records each Gate's proof and outcome for a run so the proof can be repeated and its result inspected. It is history about that run, not current certification, and it is not the raw report the run writes.
_Avoid_: Proof log, evidence file

**Established Harness**:
The state in which every Gate in the Gate Floor is adopted: each runs under its approved scope and cadence (the day-zero defaults on the greenfield path, the adoption criteria on the adoption path), enforces its Contract under those criteria, and its Gate Proof turns the appropriate Entry Point red because of it. Tolerated findings the adoption criteria accept do not prevent establishment.
_Avoid_: Complete harness, certified harness

**Entry Point**:
A single command that runs Gates, in two tiers: the full Entry Point is what CI calls for a change, and the fast Entry Point runs the quick subset for local hooks. The full Entry Point has two modes, validation by change and integral validation, and the mode is part of its definition rather than another command. These are the only commands a Guide may name.
_Avoid_: Check script

**Validation by change**:
The full Entry Point's mode for a change: it selects deterministically, through versioned policy, the Gates and scopes the change affects, including the files that depend on it, and widens when a shared configuration or dependency change or an impact it cannot establish makes a reduced scope unreliable. Its green result states what it verified and is never a claim of integral verification.
_Avoid_: Incremental validation, affected-only validation

**Integral validation**:
The full Entry Point's mode that runs every Gate over its whole input, including the checks versioned policy assigns to periodic execution. It runs under the approved cadence, and its failures stay visible to the changes they cover.
_Avoid_: Full scan, complete verification

**Selection policy**:
The versioned, executable configuration that decides which checks validation by change runs, which changes make each one apply, which scope it verifies, at which cadence it runs, what each one costs, and what the validation budget is. Equivalent changes under the same policy select the same checks over the same scopes.
_Avoid_: Impact matrix, gate selection rules

**Validation budget**:
The time the maintainer approves for validating one change, recorded in the selection policy. Required validation wider than the budget makes the result inconclusive: non-zero, with no expensive check started and the decision needed to proceed named.
_Avoid_: Time limit, CI timeout

**Periodic check**:
A check that versioned policy assigns to integral validation rather than to every change, because no reliable reduced scope exists for it. Validation by change omits it and reports it, and the policy states the protection it gives between its executions and the residual risk in between.
_Avoid_: Nightly job, slow check

**Inconclusive result**:
A non-zero validation result stating that the validation a change requires was not run, because it exceeds the approved budget or a periodic failure's relationship to the change could not be established. It is neither a pass nor a Gate failure.
_Avoid_: Skipped check, unknown result

**Walking Skeleton**:
The smallest end-to-end slice of real code that exists only so every Gate has something to run against from day zero. The greenfield path builds one; the adoption path never does, because the existing application is what its Gates run against.
_Avoid_: Boilerplate, hello world

**Stack Example**:
A concrete, non-normative realization of the Gate Contracts for one technology stack.
_Avoid_: Reference implementation, supported stack
