---
name: bootstrap-harness
description: Establish an engineering Harness (agent-oriented Guides plus deterministic Gates, shaped by strategic DDD) in a greenfield repository, or adopt one in an existing application, for any stack.
disable-model-invocation: true
---

# Bootstrap Harness

Establish a **Harness** in a repository: **Guides** that steer every change before it is made, and **Gates** that deterministically pass or fail it afterwards. The skill applies to any stack and has two starting paths. A greenfield repository is shaped from day zero. An existing application is adopted through a staged, approved plan that preserves what already works instead of generating a replacement, then executes that plan until every Gate in the Gate Floor is adopted or explicitly reported as pending or blocked.

One principle governs every phase: **the code is the source of truth**, Gate configuration included. A Guide holds only what code cannot express (intent and rationale, judgment rules no Gate can verify, and pointers into the code). Thresholds, context lists, and commands live in code, and Guides point at them. The glossary is the one document with authority over the code, and only over naming.

Both paths use the same [Gate Contracts](GATE-CONTRACTS.md); adoption changes a Gate's approved scope, when it runs, and how often, and records the adoption criteria under which it runs, never what the Contract requires. It also records the specific existing violations those criteria tolerate, because an existing application carries legacy debt that adoption neither hides nor has to erase.

Work the phases in order. Start a phase only when the previous one meets its completion criterion.

## 1. Select the starting path

Inspect the repository. It is **greenfield** when it holds no application source code, no tests of application behavior, and no delivered behavior. It may hold a README, license, ignore files, and editor or tooling config, including a task runner, formatter, or CI config for the project to come; tooling config alone never makes a repository an existing application. It is an **existing application** when it holds application source, tests of application behavior, delivered behavior, or application-specific tooling that operates on that existing code. If there is no application source, tests, or delivered behavior, the path is greenfield regardless of what tooling config exists.

State the selected path and the evidence for it to the user, then follow that path's phases. The greenfield path keeps its day-zero expectations. The adoption path starts with an inventory and reaches an approved plan before anything in the application, its tests, or its tooling changes.

**Done when** the path is selected and the evidence for it has been stated.

## Greenfield path

Phases 2 to 7 establish the Harness from day zero. They keep the day-zero expectations and never inherit an allowance granted on the adoption path.

### 2. Interview the domain

Run the domain interview in [INTERVIEW.md](INTERVIEW.md), section _Domain_, and write `GLOSSARY.md` as terms resolve. Record every confirmed answer, numbered as in the interview, in `INTERVIEW-ANSWERS.md` beside it, so the same project can be regenerated and reviewed.

**Done when** the user has confirmed every subdomain with its kind (core, supporting, generic), every bounded context with its subdomain, the allowed dependencies between contexts, the glossary terms of each context, the scenario language, and the initial business scenarios, and the answers are recorded.

### 3. Interview the stack

Read [GATE-CONTRACTS.md](GATE-CONTRACTS.md), then run the stack interview in [INTERVIEW.md](INTERVIEW.md), section _Stack_. Add the confirmed answers to `INTERVIEW-ANSWERS.md`, including the tool and version chosen for every Gate.

**Done when** the user has confirmed the language and runtime, the deliverable type and its outermost edge, the infrastructure of each context, one pinned tool for every Gate Contract including the executor that runs the Gherkin scenarios, the Entry Point mechanism, the CI provider, and any threshold that departs from the defaults, and the stack answers are recorded.

### 4. Build the Walking Skeleton

Shape the code as a modular monolith with one module per bounded context, named as in the glossary. Any other shape requires an ADR the user approved during the interviews.

In each context, build one trivial operation that a request through the outermost edge reaches. Give each context the infrastructure adapter it needs, and keep its domain model free of infrastructure and framework imports. Expose each context to others only through a public interface.

Write the first tests at every level defined in [GATE-CONTRACTS.md](GATE-CONTRACTS.md): unit tests for each context's domain model, integration tests for each adapter against real infrastructure, and e2e scenarios that reach every context through the outermost edge.

The e2e level starts from the scenarios the domain interview approved. Write them as Gherkin feature files in the confirmed scenario language, then the step definitions that drive the built artifact. The scenarios carry the business goal, the conditions, and the observable outcome; the step definitions carry the delivery mechanics. Keep the e2e portfolio to the few full journeys the Contract asks for.

**Done when** the deliverable builds and runs, and the approved e2e scenarios reach every context and pass against the built artifact.

### 5. Wire the Gates

Implement every Gate in [GATE-CONTRACTS.md](GATE-CONTRACTS.md) with the tools confirmed in phase 3, versions pinned and thresholds in versioned config. Expose them through the two Entry Points: the fast one runs the Gates marked fast, and the full one has the two [modes](GATE-CONTRACTS.md#execution-modes), validation by change and integral validation. Make CI call the full Entry Point in its change mode and nothing else, make the pre-commit hook call the fast one, and make the approved cadence call integral validation. Make the CI checkout give each Gate what it measures: the history a history scan covers, and a base branch the changed-set comparison can resolve.

Put the [selection policy](GATE-CONTRACTS.md#execution-modes) in versioned code: every check with its tier, the changes that make it apply, the scope it verifies, its cadence, and its estimated cost, plus the validation budget agreed in the interview. Selection must include the files that depend on a change, and must widen on a shared configuration or dependency change and on any impact it cannot establish; required validation wider than the budget exits non-zero and inconclusive without starting an expensive check. Report executed checks and their scopes, non-applicable checks, periodic checks with their last integral result, failures and inconclusive outcomes distinctly.

Rehearse the modes on a disposable copy of the project with a controlled budget fixture, and keep the rehearsal executable and out of both Entry Points: a violation in an affected dependent is caught rather than listed, a shared configuration change widens the selection, a required validation beyond the budget is inconclusive and starts nothing, and integral validation runs a check validation by change only reported. Keep the rehearsal's transcript uncommitted; commit the script that reproduces it.

When wiring the e2e Gate, verify that its executor fails rather than passes on a wrong assertion and on each case the Contract's E2E section names: no scenarios, an undefined or pending step, and an artifact that does not start. A configuration that behaves otherwise does not satisfy the Contract.

**Done when** every Gate Contract has a Gate, both modes of the full Entry Point run, the modes have been rehearsed on a disposable copy, and the full Entry Point is green.

### 6. Write the Guides

Write the Guides as described in [GUIDES.md](GUIDES.md).

**Done when** every file in the GUIDES.md inventory exists and the full Entry Point, including the Guide pointer Gate, is green.

### 7. Prove every Gate

Run a **Gate Proof** for each Gate, one at a time: introduce the smallest violation that Gate exists to catch, run the Entry Point of its tier with only that violation present, confirm it goes red _because of that Gate_, then revert the violation before the next proof. A full-tier proof runs the full Entry Point in its validation-by-change mode, so the violation must be selected by the affected scope for the red result to be attributable to the Gate under proof. One violation per run is what makes the result attributable: the Entry Point stops at the first Gate that fails, so several violations in one tree would leave several Gates red and no run could say which Gate caught which. GATE-CONTRACTS.md suggests a violation for each Gate. Keep the violations in an executable proof file so the proofs can be repeated, and keep that file out of both Entry Points. Record the result in `GATE-PROOFS.md`: one row per Gate with its tier and Entry Point, tool and version, the violation, the outcome, and the failing Gate - and, for a changed-set Gate, both the files its proof declared and the files actually analyzed, so the setup is disclosed and checkable beside the violation.

A changed-set Gate may have no eligible input on the branch that carries its proof, and then no red result is possible. The Gate Proof rules in GATE-CONTRACTS.md state what such a proof owes; a stack's proof definitions and the Gate's own selection are where they are enforced. Because that setup only reaches the inputs, ordinary changed-set discovery keeps its own behavior and is verified separately.

**Done when** every Gate has been seen red for its own reason, `GATE-PROOFS.md` records it, and the full Entry Point is green on the final tree.

## Adoption path

The adoption path reconciles a Harness with an application that already exists. It does not build a replacement Walking Skeleton, restructure the application, rename its domain, reformat it, or replace working tools: the existing application is what the Gates run against. It changes nothing in the application, its tests, or its tooling before the maintainer approves the plan. Its steps are numbered A1 to A5 so the greenfield phases 2 to 7 keep their numbers.

The application carries legacy debt. Adoption records each violation the maintainer accepts as a tolerated finding in its Gate's tolerance policy, and no run regenerates that policy; [GATE-CONTRACTS.md](GATE-CONTRACTS.md#tolerated-findings) holds what such an entry must name, when it fails, how a reviewed change tightens it, and the explicit human decision a security finding needs. [Its observed-behavior rules](GATE-CONTRACTS.md#observed-behavior) hold how regression tests, failing suites, missing evidence and localized decisions are handled.

### A1. Inventory the existing application

Survey what the repository and environment already answer:

- the deliverable and its outermost edge;
- domain evidence: glossary, Guides, ADRs, module names, test names, feature files, and the language they use;
- candidate bounded contexts, their subdomain kind, and the workflows the application already exercises;
- boundaries and allowed dependencies, both declared and observed, and every mismatch between them;
- existing tools and checks, with their versions and the config that holds their limits;
- the findings those checks already report, and any existing report or CI history that holds them, by Gate, rule, location, and measured value or severity, as candidates for tolerated findings;
- failing tests and missing tools already visible in the tree or CI history, with what a bounded investigation would need;
- existing Gate Proofs and proof tooling, if any, and whether they are repeatable and still attribute a red Entry Point to the Gate under proof;
- tests by level, and what they demonstrably cover;
- the fast and full Entry Points, what each runs, and what CI calls;
- obvious gaps: a Gate Contract with no check, a check that cannot run or passes vacuously, an Entry Point or CI arrangement that does not satisfy its Contract, and the environment prerequisites a Gate needs.

Keep the inventory lightweight and factual. Read manifests, lockfiles, source layout, docs, test config, Entry Points, and CI config; do not run the expensive analyses (the full test suite, mutation, vulnerability scans) or ask the maintainer for facts the environment can answer. Record an obvious gap for the plan and stage any deep measurement later. Distinguish what you observed from what you inferred, and mark every inference for confirmation.

**Done when** the inventory covers every item above, points at the evidence for each fact, and names what it could not establish.

### A2. Confirm the inventory and adoption decisions

Run the interview in [INTERVIEW.md](INTERVIEW.md), section _Adoption_. Present the discovered facts; the maintainer confirms or corrects them and decides the domain classifications, boundaries to preserve, regression priorities, tools to retain or replace, stages, budgets, and cadence, and the adoption criteria for every Gate the plan will adopt: its scope, cadence, and any specific existing findings the maintainer accepts as [tolerated findings](GATE-CONTRACTS.md#tolerated-findings). A failing suite is investigated within the budget the interview agrees; the maintainer approves any expectation update before it records current behavior, and the Gate stays pending until that investigation ends. Adoption criteria specialize the Contract and never relax it. Do not decide any of these unilaterally and do not invent a domain model where the application already has one.

Keep the confirmed answers and the inventory's evidence outside the application until the plan is approved.

**Done when** the maintainer has confirmed the inventory, the domain understanding, the boundaries, the existing checks and tools to retain or replace, the regression priorities, the scope, budget, and cadence of every planned stage, and the adoption criteria and tolerated findings of every Gate the plan will adopt, and the answers are recorded.

### A3. Write the adoption plan and obtain approval

Draft `ADOPTION-PLAN.md` in a scratch location outside the application. Make it staged and prioritized: order stages by the protection they buy, not by tool convenience. Each stage names its scope, the Gate Contracts it realizes, the Gates it expects to adopt, the adoption criteria under which each will be adopted, the specific tolerated findings each accepts at their recorded finding identity, the reviewed-change rule that tightens them when debt is removed, the Gate Proof each adopted Gate will carry, the Guides it writes or reconciles, the tests and tooling changes it proposes, its validation budget and cadence, and what remains pending or blocked. Record every Gate's current [Gate state](GATE-CONTRACTS.md#gate-states) as adopted, pending, or blocked; a tool that exists in the tree is not an adopted Gate. The plan names the tolerated findings at approval; it does not become the tolerance policy, which is the Gate's versioned config. Once a stage records them in the policy, that policy is the only current list; the plan keeps the approval-time expectation and points at it.

Present the plan to the maintainer and obtain approval before anything in the application, its tests, or its tooling changes. Drafting and approving touch none of them.

After approval, record the approved plan in the repository as `ADOPTION-PLAN.md` and the confirmed answers in `INTERVIEW-ANSWERS.md` under _Adoption_ before the first change. Approval adopts no Gate by itself.

**Done when** the maintainer has approved the plan, the approved plan and answers are recorded in the repository as `ADOPTION-PLAN.md` and `INTERVIEW-ANSWERS.md`, and nothing in the application, its tests, or its tooling has changed.

### A4. Execute the approved plan stage by stage

Execute the plan one stage at a time and change only what the approved stage names. Reconcile rather than replace: retain a tool or check that satisfies its Contract under the agreed adoption criteria, and propose a replacement with its reason, compatibility cost, and migration work before making it; a replacement happens only with the maintainer's approval. Do not generate a Walking Skeleton: the existing application, its tests, and its tooling are what the Gates run against.

Each stage adopts its Gates under the adoption criteria the maintainer approved. For every Gate the stage adopts, run a Gate Proof as phase 7 describes, under those criteria: the single deliberate violation must be one the Gate rejects and must lie outside any tolerated finding. Keep the proof executable and repeatable, out of both Entry Points, so anyone can re-run it. Record the Gate Proof and its outcome in `GATE-PROOFS.md`, with the row phase 7 records; a raw run report is evidence of that run and is not committed in its place.

A Gate is adopted only when it meets the [adopted Gate state](GATE-CONTRACTS.md#gate-states) under the approved scope and cadence. A Gate that does not run, cannot fail, selects no meaningful input, passes vacuously, or is not yet in scope stays pending, or blocked when something outside the stage prevents it. Neither a configured Gate nor a green run under another scope is adoption.

A stage that wires the full Entry Point's [modes](GATE-CONTRACTS.md#execution-modes) records the selection policy, the approved validation budget and the periodic checks it adds, and rehearses the modes on a disposable copy before reporting them, as phase 5 describes. A stage never claims the whole application was verified from a scoped green result.

End each stage by recording its completion and Gate states in `ADOPTION-PLAN.md` and reporting the same to the maintainer: what the stage changed, which Gates it adopted, which remain pending or blocked and why, and where each proof is recorded. A stage may complete with pending or blocked Gates; its record and report say so instead of hiding them. A later approved stage may adopt a Gate an earlier stage left pending only by running it under its approved criteria and proving it; no stage inherits adoption from another.

Record each tolerated finding the stage accepts in the Gate's tolerance policy, with its finding identity, as part of the stage's reviewed change, and change no entry outside one: no run regenerates that policy. An entry for legacy debt the plan did not name amends the adoption criteria, approved as the plan was. The tolerance rules themselves - how a finding is identified, when it fails, how a reviewed change tightens an entry, and the explicit human decision a security finding needs - are the ones [GATE-CONTRACTS.md](GATE-CONTRACTS.md#tolerated-findings) states.

Where the approved stage names a workflow whose behavior no test pins down, write the regression test that records what it does today before changing that behavior. A workflow the stage does not name is staged for a later approved stage, not changed now. The test records the behavior, not the business rule: it does not audit whether the behavior is right, and only exceptionally strong evidence of an obvious error opens a localized decision for the maintainer, as [GATE-CONTRACTS.md](GATE-CONTRACTS.md#observed-behavior) defines it. A failing suite is investigated within the stage's budget and ends in a fix, an expectation update the maintainer approves before it records current behavior, or a pending or blocked Gate. A count of failing assertions is never an accepted reference. A missing test leaves its Gate pending; a tool the environment cannot run leaves it blocked.

**Done when** every approved stage has been executed or explicitly reported as pending or blocked, its completion and Gate states are recorded in `ADOPTION-PLAN.md`, every Gate the plan adopted has its repeatable Gate Proof recorded, its tolerated findings, if any, are recorded in the Gate's tolerance policy, and the regression tests the stage proposed are in place or their absence is recorded as a pending Gate.

### A5. Complete and report establishment

Report every Gate in the Gate Floor with its [Gate state](GATE-CONTRACTS.md#gate-states): adopted, pending, or blocked, together with the evidence or blocker for each. Name the tools and checks retained and every replacement made with its approval and reason, the Guides reconciled, the Gate Proofs recorded, the tolerated findings each Gate accepts with their finding identity, and every localized decision taken during adoption. State the validation budget, every check assigned to periodic execution with its cadence, the protection each gives between executions and the residual risk in between, and the result of the modes' rehearsal.

State explicitly whether the Harness counts as established, which [GATE-CONTRACTS.md](GATE-CONTRACTS.md#establishment) defines as every Gate in the Gate Floor being adopted. Establishment does not require eliminating legacy debt or meeting every greenfield default threshold; tolerated findings the adoption criteria accept do not prevent it. A pending or blocked Gate does prevent it, and the report names which Gate and why. A final full Entry Point that is red for a finding the adoption criteria do not accept is not establishment: the report names that Gate.

**Done when** every Gate has one of the three states with its evidence or blocker, the establishment statement is explicit, the retained and replaced tools are reported, the tolerated findings and localized decisions are reported, and the full Entry Point has been run on the final tree with its result reported.

## Gate states and blockers

The [Gate states](GATE-CONTRACTS.md#gate-states) are **adopted**, **pending**, and **blocked**. [GATE-CONTRACTS.md](GATE-CONTRACTS.md) holds their rules; every report and claim uses one of them.

On the greenfield path, every Gate in the Gate Floor runs before the Harness counts as established. When the environment cannot run one, stop at that phase and report the blocker and what the user must provide. Blockers include a missing container runtime, no network for the vulnerability database, and a host binary a Gate shells out to; check what each tool needs before starting phase 7. The run resumes from that phase once the blocker is cleared.

On the adoption path, record a Gate the environment cannot run as blocked in the inventory and the plan, with what the maintainer must provide. It stays out of the adopted count and the Harness cannot be established while it is blocked. A Gate that runs but whose green result does not exercise its Contract - an empty selection, a skipped suite, a check that cannot fail - passes vacuously and stays pending. A Gate whose suite fails or whose test is missing is pending; a tool the environment cannot run is blocked; a count of failing assertions is not a state.

## Final report

On the greenfield path, report to the user:

- the subdomains and bounded contexts;
- a table of Gate, tool and version, tier, Gate Proof result, and Gate state: adopted when the Gate actually ran under the Entry Points' scope and cadence and its proof turned red because of it, otherwise pending or blocked;
- the ADRs written;
- any blocker that remains.

On the adoption path, report the selected path, the confirmed inventory, the approved plan and its stage order, the state of every Gate in the Gate Floor with the evidence or blocker for each, the tolerated findings each Gate accepts and every localized decision, the tools and checks retained or replaced with the approval and reason, and an explicit statement of whether the Harness is established. Do not report a Gate as adopted unless it meets the [adopted Gate state](GATE-CONTRACTS.md#gate-states), and do not call the Harness established while any Gate in the Gate Floor is pending or blocked.

## Stack Examples

Non-normative realizations of the Gate Contracts for specific stacks live in <https://github.com/Sanmoo/skills/tree/main/examples>. When one matches the chosen stack, consult it for how a Gate looks when done well; the TypeScript example also records its [interview answers](../../examples/typescript/INTERVIEW-ANSWERS.md), [Gate Proofs](../../examples/typescript/GATE-PROOFS.md), and [what generating it exposed in this skill](../../examples/typescript/SKILL-FEEDBACK.md). The Gate Contracts remain the authority. An example's Gherkin executor and scenario language are realizations for its stack, never rules for another: a universal obligation comes only from a Gate Contract.
