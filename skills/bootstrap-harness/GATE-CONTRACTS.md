# Gate Contracts

Each Gate Contract states a Gate's intent and acceptance criteria for any stack. The tool that realizes it is chosen in the stack interview; where a Contract's scenarios need a language, the domain interview settles it. Where acceptance also depends on a judgment no tool can make, the acceptance criteria include a **Human review**; the Gate runs its executable criteria, and neither the run nor the review stands in for the other. Together these Gates form the **Gate Floor**: every project has all of them. A greenfield project establishes every one from day zero; an existing application adopts them in approved stages. Either path counts as established only when every Gate in the Gate Floor is adopted.

Both starting paths use these same Contracts. Adoption records an approved scope, cadence, and adoption criteria for each Gate, and may record specific accepted findings in versioned policy, but it never redefines a Contract, weakens its intent, or creates a second set. The Contract remains the obligation.

## Rules for every Gate

- **Deterministic.** The same tree gives the same result everywhere. Every tool is pinned to an exact version: language dependencies through the lockfile, standalone binaries through a declarative version manager.
- **Configured in code.** Thresholds, scopes, and rules live in versioned config files. Guides point at those files.
- **Red means non-zero.** A violation makes the Entry Point exit non-zero and names the Gate and the offending location.
- **Warnings are errors.** A finding either fails the Gate or is excluded in config with a comment stating why.
- **Tiered.** Fast Gates run in both Entry Points. Full Gates run only in the full Entry Point, which CI calls.
- **Core thresholds.** Where a contract sets a stricter threshold for core, the Gate config applies it to the modules of core contexts.
- **Third-party code.** Exclude it from traversal, never from rule targets: an exclusion that hides a target also hides the violation. A rule that depends on matching the target path must still see the dependency it forbids.
- **Own level.** A Contract's obligation stops at its own level; the Gherkin obligation on e2e adds none to unit or integration tests.
- **Honest state.** Every claim about a Gate uses the state vocabulary below.

## Gate states

- **Adopted**: the Gate actually runs under the approved scope and cadence, enforces the agreed adoption criteria, and has a repeatable Gate Proof whose violation - outside any finding those criteria accept - turns the appropriate Entry Point red because of that Gate. A green run that does not meet all three is not adoption.
- **Pending**: the Gate is not adopted and nothing outside the work prevents it from being adopted. Missing, unexecuted, unproven, not-yet-in-scope, and vacuously passing Gates are pending. A check passes vacuously when it reports success without exercising its Contract: no meaningful input, an empty selection, a skipped suite, or a result that cannot fail. A pending Gate is not protection; its absence is reported, not hidden.
- **Blocked**: the Gate cannot run because the environment, a missing tool, a missing decision, or another external dependency prevents it. Record what the maintainer must provide. A blocked Gate is not adopted, and scheduling it later does not make it adopted.

A run can be green while its Gate remains pending: green is a result, not a state. Do not claim a Gate is adopted because it is configured, because it is on a schedule, because a raw check passed, or because it passed under a scope the maintainer did not approve.

## Adoption criteria

Adoption criteria are the approved scope, cadence, and specific existing findings the maintainer accepts for a Gate. They specialize how its Contract applies to this application - which code or contexts a Gate covers, when it runs, and which present findings are accepted - and never relax the Contract's intent or replace its acceptance criteria. A Gate that does not run under the approved criteria, or that passes vacuously, remains pending.

An existing tool or check that satisfies its Contract under those criteria is retained. A replacement is proposed with its reason, compatibility cost, and migration work, and made only after the maintainer approves it. Two checks for one Contract are not two Gates; the plan names the one that serves as the Gate.

An adopted Gate is proved against the criteria, not around them: its Gate Proof introduces a violation the Gate must reject, outside any accepted finding. A proof whose violation falls inside the accepted tolerance shows that the Gate tolerates what it was told to tolerate, not that it rejects what it must reject.

## Establishment

A Harness is established when every Gate in the Gate Floor is adopted. Establishment does not require eliminating debt or meeting every greenfield default threshold: findings the adoption criteria accept do not prevent it. A pending or blocked Gate does prevent it, and the final report names that Gate and why. Establishment is a claim about what runs and what was proved, not about how clean the application is.

## Rules for every Gate Proof

- **One violation.** The proof's tree carries exactly one deliberate violation - the smallest its Gate exists to catch, and outside anything the Gate's adoption criteria accept (the greenfield path accepts none) - and the Entry Point of the Gate's tier exits non-zero naming that Gate. Several violations in one tree, or a red Gate that is not the Gate under proof, prove nothing.
- **Repeatable.** The violation lives in an executable proof file kept out of both Entry Points, so any later run can repeat the proof. A manual edit that leaves no reproducible definition is not a Gate Proof.
- **Reachable input.** A Gate that analyzes only the files changed relative to a base can have no eligible input on the branch that carries its proof. Such a proof declares, beside the violation, the smallest set of eligible files the violation needs, and for that execution only the declaration replaces the Gate's changed-set selection. The declaration is setup, not a second violation: no source marker and no artificial comparison base stands in for it. How it reaches the Gate is the stack's choice.
- **Ordinary Gate, ordinary Entry Point.** The proof still runs the Entry Point of the Gate's tier, and the Gate's analysis, pinned tools, and thresholds are the ones validation uses. An isolated Gate target or a whole-scope command is not a Gate Proof.
- **Invalid scope fails.** An explicitly empty, missing, or ineligible declared input makes the proof exit non-zero and say why. It must not widen to other files, fall back to the ordinary selection, or be accepted as the intended violation.
- **Bound to its run.** A declaration applies to that execution only and is restored with the violation, so it reaches neither a later proof nor ordinary validation, including after a failure.
- **Evidence names both scopes.** The record keeps the requested files and the files actually analyzed, alongside the Entry Point, the violation, the outcome, and the failing Gate, in a form that survives output truncation. A scope that could not be measured is recorded as unavailable, never as an empty set.
- **Ordinary selection is verified separately.** Explicit-scope enforcement does not show that changed-set discovery still works, so the selection behavior the Contract describes, its legitimate empty set included, is checked on its own.
- **Fresh evidence.** A recorded outcome belongs to the tree it ran against; an earlier run does not validate a later change.

## Format

- **Intent**: keep the code in the shape the formatter defines, so diffs carry only meaning.
- **Passes when**: every source file already matches the formatter's output (check mode; the Gate never rewrites).
- **Tier**: fast.
- **Gate Proof**: misindent one line.

## Lint

- **Intent**: catch the defects and idioms the ecosystem's linter knows about.
- **Passes when**: the linter reports zero findings under the project's rule set.
- **Tier**: fast.
- **Gate Proof**: add an unused variable.

## Types

- **Intent**: reject programs the type system can prove wrong.
- **Passes when**: the type checker reports zero errors in strict mode. For a dynamically typed language, use the ecosystem's mature checker. When none exists, record an ADR and rely on the other Gates.
- **Tier**: fast.
- **Gate Proof**: pass a value of the wrong type to a function.

## Unit tests

- **Intent**: pin down the behavior of each domain model.
- **Passes when**: every unit test passes. Unit tests exercise a module through its public interface, perform no I/O, and replace nothing the project itself owns.
- **Tier**: fast.
- **Gate Proof**: invert a condition in a domain operation.

## Integration tests

- **Intent**: prove each context works with its real infrastructure.
- **Passes when**: every integration test passes. Each one drives a context against real instances of its infrastructure, typically ephemeral containers. Test doubles stand in only for third-party systems, at the context's boundary.
- **Tier**: full.
- **Gate Proof**: break a query or mapping in an adapter.

## E2E tests

- **Intent**: prove the deliverable works as shipped, through scenarios a business reviewer can read and validate. The Gate proves the deliverable behaves as the scenarios say; a failing scenario makes the Entry Point exit non-zero, while whether the scenarios say the right thing is a human judgment that no parser, linter, or passing run establishes.
- **Passes when**: every e2e scenario passes, and the level meets every criterion the Gate runs below:
  - **Executable Gherkin.** The e2e level is a suite of Gherkin feature files run by the pinned executor.
  - **Outermost edge.** Each scenario drives the deliverable, built as it ships, through its outermost edge. Together the scenarios reach every bounded context.
  - **Built before run.** The Entry Point builds the deliverable before this level runs, so local and CI validation exercise the same artifact.
  - **Readiness, not sleep.** Each scenario waits for a readiness signal from the running artifact instead of sleeping for a fixed time.
  - **Nothing passes vacuously.** A run that reports success with no scenarios, with an undefined or pending step, or with an artifact that failed to start does not satisfy the Gate.
- **Human review**: a business reviewer approves the scenario set before its step definitions are written, and reviews what no Gate can:
  - each scenario states a business goal, the conditions that precede it, and its observable outcome in the glossary's terms;
  - delivery mechanics — HTTP requests and status codes, selectors, queries, payload shapes, implementation steps — stay in the step definitions, and the chosen scenario language introduces no competing domain model;
  - the portfolio is a small set of full business journeys, not a copy of the integration test matrix; a journey may traverse behavior already tested below when it adds evidence about the built artifact, the connections between components, and the public edge, and a protocol-specific check that adds no business review stays at the integration level;
  - a green Gate does not stand in for this review.
- **Tier**: full.
- **Gate Proof**: break the route or command that reaches one context.

## Mutation

- **Intent**: prove the tests would notice a wrong change, which coverage alone cannot.
- **Passes when**: the mutation score is at least **80%** overall and at least **90%** in core contexts. The full Entry Point mutates only code changed relative to the base branch (`main`, or `MUTATION_BASE` when the environment sets it), which on day zero is all of it; the changed set includes the working tree and untracked files, not only commits. A scheduled CI job mutates the whole codebase periodically. When the mutation tool has no per-context threshold, a wrapper reads its machine-readable report and applies the overall and core limits itself. When the changed set cannot be established - for example, no resolvable base branch, no earlier commit to compare against, no shared history with it, or files that cannot be listed or resolved - the Gate states that in its own output and mutates the whole codebase. That is a widening of scope, not a finding, so it does not fail the Gate, and the thresholds still apply to everything mutated. When HEAD is the base branch's own tip, the change to measure is what landed with the tip commit: the tip against its first parent. A push that lands several commits therefore measures only the tip; the scheduled whole-codebase run covers the rest.
- **Tier**: full.
- **Gate Proof**: delete the assertions of a core unit test, declaring the core domain file that test covers as the proof's scope, which replaces the changed set for that one execution through the stack's own transport.

## Context boundaries

- **Intent**: keep each bounded context's model its own.
- **Passes when**: a context imports another context only through that context's public interface, and only along a declared allowed dependency. The declared allowed dependencies form an acyclic graph. That declaration, in the Gate's config, is the project's context map.
- **Tier**: fast.
- **Gate Proof**: import a non-public module of another context.

## Dependency rule

- **Intent**: keep each domain model independent of delivery and storage.
- **Passes when**: no module in a context's domain model imports infrastructure, framework, or adapter code.
- **Tier**: fast.
- **Gate Proof**: import a database client in a domain module.

## Static metrics

- **Intent**: hold structural quality to absolute limits, measured locally.
- **Passes when**, computed by pinned local tools with no external service:
  - cyclomatic complexity is at most **10** per function;
  - there are **zero** dependency cycles between modules;
  - duplicated code is at most **3%**.
- **Tier**: fast.
- **Gate Proof**: write a function with eleven independent branches.

## Dependency vulnerabilities

- **Intent**: ship no dependency with a known serious vulnerability.
- **Passes when**: zero known vulnerabilities of high or critical severity exist across all locked dependencies.
- **Tier**: full.
- **Gate Proof**: lock a dependency version with a published critical advisory.

## Secrets

- **Intent**: keep credentials out of the repository.
- **Passes when**: the scanner finds zero secrets in the working tree and in history.
- **Tier**: fast.
- **Gate Proof**: add a file containing a well-formed fake cloud access key.

## Avoided terms

- **Intent**: keep the code speaking the glossary's language.
- **Passes when**: no identifier in source code contains a term listed under `_Avoid_` in `GLOSSARY.md`. Matching is case-insensitive on whole words, after splitting identifiers on camelCase, snake_case, and kebab-case boundaries. The Gate reads `GLOSSARY.md` directly, so the list exists in one place. A term that the ecosystem also uses as an identifier, such as `Instance` in `toBeInstanceOf`, cannot be enforced this way; prefer terms the stack does not already speak.
- **Tier**: fast.
- **Gate Proof**: rename a domain identifier to an avoided synonym.

## Guide pointers

- **Intent**: keep every Guide pointing at code that exists.
- **Passes when**: every relative link and file path in `AGENTS.md`, `GLOSSARY.md`, `docs/guides/`, and `docs/adr/` resolves, and every command a Guide names is one of the two Entry Points. A command is a tool name followed by an argument; a bare file path that starts with a tool name is not a command.
- **Tier**: fast.
- **Gate Proof**: point a Guide link at a file that does not exist.
