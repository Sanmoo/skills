---
name: bootstrap-harness
description: Establish an engineering Harness (agent-oriented Guides plus deterministic Gates, shaped by strategic DDD) in a greenfield repository, or adopt one in an existing application, for any stack.
disable-model-invocation: true
---

# Bootstrap Harness

Establish a **Harness** in a repository: **Guides** that steer every change before it is made, and **Gates** that deterministically pass or fail it afterwards. The skill applies to any stack and has two starting paths. A greenfield repository is shaped from day zero. An existing application is adopted through a staged, approved plan that preserves what already works instead of generating a replacement.

One principle governs every phase: **the code is the source of truth**, Gate configuration included. A Guide holds only what code cannot express (intent and rationale, judgment rules no Gate can verify, and pointers into the code). Thresholds, context lists, and commands live in code, and Guides point at them. The glossary is the one document with authority over the code, and only over naming.

Both paths use the same [Gate Contracts](GATE-CONTRACTS.md). Adoption changes when, where, and how often a Gate runs; it never changes what the Contract requires and never defines a second set.

Work the phases in order. Start a phase only when the previous one meets its completion criterion.

## 1. Select the starting path

Inspect the repository. It is **greenfield** when it holds no application source code: at most a README, license, ignore files, and editor or tooling config. It is an **existing application** when it already holds application source, tests, delivered behavior, or tooling that belongs to the application.

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

Implement every Gate in [GATE-CONTRACTS.md](GATE-CONTRACTS.md) with the tools confirmed in phase 3, versions pinned and thresholds in versioned config. Expose them through the two Entry Points: the full one runs every Gate, the fast one runs the Gates marked fast. Make CI call the full Entry Point and nothing else, and make the pre-commit hook call the fast one. Make the CI checkout give each Gate what it measures: the history a history scan covers, and a base branch the changed-set comparison can resolve.

When wiring the e2e Gate, verify that its executor fails rather than passes on a wrong assertion and on each case the Contract's E2E section names: no scenarios, an undefined or pending step, and an artifact that does not start. A configuration that behaves otherwise does not satisfy the Contract.

**Done when** every Gate Contract has a Gate and the full Entry Point is green.

### 6. Write the Guides

Write the Guides as described in [GUIDES.md](GUIDES.md).

**Done when** every file in the GUIDES.md inventory exists and the full Entry Point, including the Guide pointer Gate, is green.

### 7. Prove every Gate

Run a **Gate Proof** for each Gate, one at a time: introduce the smallest violation that Gate exists to catch, run the Entry Point of its tier with only that violation present, confirm it goes red _because of that Gate_, then revert the violation before the next proof. One violation per run is what makes the result attributable: the Entry Point stops at the first Gate that fails, so several violations in one tree would leave several Gates red and no run could say which Gate caught which. GATE-CONTRACTS.md suggests a violation for each Gate. Keep the violations in an executable proof file so the proofs can be repeated, and keep that file out of both Entry Points. Record the result in `GATE-PROOFS.md`: one row per Gate with its tier, tool and version, the violation, and the outcome.

**Done when** every Gate has been seen red for its own reason, `GATE-PROOFS.md` records it, and the full Entry Point is green on the final tree.

## Adoption path

The adoption path reconciles a Harness with an application that already exists. It does not build a replacement Walking Skeleton, restructure the application, rename its domain, reformat it, or replace working tools. It changes nothing in the application, its tests, or its tooling before the maintainer approves the plan.

### A1. Inventory the existing application

Survey what the repository and environment already answer:

- the deliverable and its outermost edge;
- domain evidence: glossary, Guides, ADRs, module names, test names, feature files, and the language they use;
- candidate bounded contexts, their subdomain kind, and the workflows the application already exercises;
- boundaries and allowed dependencies, both declared and observed, and every mismatch between them;
- existing tools and checks, with their versions and the config that holds their limits;
- tests by level, and what they demonstrably cover;
- the fast and full Entry Points, what each runs, and what CI calls;
- obvious gaps: a Gate Contract with no check, a check that cannot run, an Entry Point or CI arrangement that does not satisfy its Contract, and the environment prerequisites a Gate needs.

Keep the inventory lightweight and factual. Read manifests, lockfiles, source layout, docs, test config, Entry Points, and CI config; do not run the expensive analyses (the full test suite, mutation, vulnerability scans) or ask the maintainer for facts the environment can answer. Record an obvious gap for the plan and stage any deep measurement later. Distinguish what you observed from what you inferred, and mark every inference for confirmation.

**Done when** the inventory covers every item above, points at the evidence for each fact, and names what it could not establish.

### A2. Confirm the inventory and adoption decisions

Run the adoption interview in [INTERVIEW.md](INTERVIEW.md), section _Adoption_. Present the discovered facts; the maintainer confirms or corrects them and decides the domain classifications, boundaries to preserve, regression priorities, tools to retain or replace, stages, scopes, budgets, and cadence. Do not decide any of these unilaterally and do not invent a domain model where the application already has one.

Record every confirmed answer in `INTERVIEW-ANSWERS.md` under _Adoption_, and keep the inventory's evidence beside it.

**Done when** the maintainer has confirmed the inventory, the domain understanding, the boundaries, the existing checks and tools to retain or replace, the regression priorities, and the scope, budget, and cadence of every planned stage, and the answers are recorded.

### A3. Write the adoption plan and obtain approval

Write `ADOPTION-PLAN.md` beside `INTERVIEW-ANSWERS.md`. Make it staged and prioritized: order stages by the protection they buy, not by tool convenience. Each stage names its scope, the Gate Contracts it realizes, the Gates it expects to adopt, the Guides it writes or reconciles, the tests and tooling changes it proposes, its validation budget and cadence, and what remains pending or blocked. Record every Gate's current [Gate state](GATE-CONTRACTS.md#gate-states) as adopted, pending, or blocked; a tool that exists in the tree is not an adopted Gate.

Present the plan to the maintainer and obtain approval before anything in the application, its tests, or its tooling changes. Drafting the plan touches none of them.

**Done when** the maintainer has approved the plan and the approved plan is recorded.

### A4. Execute the approved plan

Execute the plan one stage at a time and change only what the approved stage names. Reconcile rather than replace: retain a tool or check that satisfies the agreed criteria, and propose a replacement with its reason and cost before making it.

Each stage ends with an honest Gate-state report. A Gate is adopted only when it actually runs under the approved scope and cadence and its Gate Proof is recorded; until then it is pending, or blocked when something outside the stage prevents it. Scheduling, configuring, or a green run under another scope is not adoption. A blocked Gate is never faked or counted as adopted; its absence of protection stays stated.

**Done when** the plan's stages are complete or are explicitly reported as pending or blocked, and every Gate is reported in one of the three states.

## Gate states and blockers

A Gate is **adopted** only when it actually runs under the approved scope and cadence, has a repeatable Gate Proof, and enforces the agreed adoption criteria. Otherwise it is **pending**, or **blocked** when the environment or a missing decision prevents it from running. [GATE-CONTRACTS.md](GATE-CONTRACTS.md) holds the full rules; every report and claim uses those three states.

On the greenfield path, every Gate in the Gate Floor runs before the Harness counts as established. When the environment cannot run one, stop at that phase and report the blocker and what the user must provide. Blockers include a missing container runtime, no network for the vulnerability database, and a host binary a Gate shells out to; check what each tool needs before starting phase 7. The run resumes from that phase once the blocker is cleared.

On the adoption path, record a Gate the environment cannot run as blocked in the inventory and the plan, with what the maintainer must provide. It stays out of the adopted count and the Harness cannot be established while it is blocked.

## Final report

On the greenfield path, report to the user:

- the subdomains and bounded contexts;
- a table of Gate, tool and version, tier, and Gate Proof result;
- the ADRs written;
- any blocker that remains.

On the adoption path, report the selected path, the confirmed inventory, the approved plan and its stage order, and the state of every Gate in the Gate Floor: adopted, pending, or blocked, with the evidence or blocker for each. Do not report a Gate as adopted unless it actually ran under the approved scope and cadence.

## Stack Examples

Non-normative realizations of the Gate Contracts for specific stacks live in <https://github.com/Sanmoo/skills/tree/main/examples>. When one matches the chosen stack, consult it for how a Gate looks when done well; the TypeScript example also records its [interview answers](../../examples/typescript/INTERVIEW-ANSWERS.md), [Gate Proofs](../../examples/typescript/GATE-PROOFS.md), and [what generating it exposed in this skill](../../examples/typescript/SKILL-FEEDBACK.md). The Gate Contracts remain the authority. An example's Gherkin executor and scenario language are realizations for its stack, never rules for another: a universal obligation comes only from a Gate Contract.

The adoption path's plan rehearsal against a disposable copy of the TypeScript example is recorded in [the adoption-plan rehearsal](../../docs/evidence/adoption-plan-rehearsal.md): it reached an approved plan without changing the copy.
