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

**Inventory**:
The lightweight, factual survey of an existing application made before any change. It records what the environment answers instead of asking, and leaves expensive analysis to later stages; the skill's inventory step lists what it covers.
_Avoid_: Functional audit, application assessment

**Interview answers**:
The file `INTERVIEW-ANSWERS.md` that records the confirmed answers to the domain, stack, or adoption interview so the run can be repeated and reviewed. It is a decision record, not a Guide or current policy.
_Avoid_: Questionnaire, survey responses

**Adoption plan**:
The staged, prioritized proposal for establishing the Harness in an existing application. The maintainer approves it before anything in the application, its tests, or its tooling changes, and executing it adopts Gates stage by stage.
_Avoid_: Migration plan, rewrite plan

**Adoption criteria**:
The scope, cadence, and specific accepted findings the maintainer approves for a Gate during adoption. They specialize the Gate Contract for this application and never replace or weaken it; a Gate that does not run under them, or that passes vacuously, is not adopted.
_Avoid_: Adoption rules, gate policy

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
The repeatable, attributable violation that shows a Gate turns the appropriate Entry Point red. It is required before that Gate counts as adopted, and its violation lies outside any finding the Gate's adoption criteria accept (the greenfield path accepts none).
_Avoid_: Smoke test

**Gate Proof record**:
The committed file, `GATE-PROOFS.md`, that records each Gate's proof and outcome so the proof can be repeated and its result inspected. It is history about the tree a proof ran against, not current certification.
_Avoid_: Proof log, evidence file

**Established Harness**:
The state in which every Gate in the Gate Floor is adopted: each runs under its approved scope and cadence (the day-zero defaults on the greenfield path, the adoption criteria on the adoption path), enforces its Contract under those criteria, and its Gate Proof turns the appropriate Entry Point red because of it. Debt the adoption criteria accept does not prevent establishment.
_Avoid_: Complete harness, certified harness

**Entry Point**:
A single command that runs Gates, in two tiers: the full Entry Point runs every Gate and is what CI calls for a change; the fast Entry Point runs the quick subset for local hooks. These are the only commands a Guide may name.
_Avoid_: Check script

**Walking Skeleton**:
The smallest end-to-end slice of real code that exists only so every Gate has something to run against from day zero. The greenfield path builds one; the adoption path never does, because the existing application is what its Gates run against.
_Avoid_: Boilerplate, hello world

**Stack Example**:
A concrete, non-normative realization of the Gate Contracts for one technology stack.
_Avoid_: Reference implementation, supported stack
