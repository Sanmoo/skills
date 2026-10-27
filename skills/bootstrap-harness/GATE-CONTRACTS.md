# Gate Contracts

Each Gate Contract states a Gate's intent and acceptance criteria for any stack. The tool that realizes it is chosen in the stack interview; where a Contract's scenarios need a language, the domain interview settles it. Where acceptance also depends on a judgment no tool can make, the acceptance criteria include a **Human review**; the Gate runs its executable criteria, and neither the run nor the review stands in for the other. Together these Gates form the **Gate Floor**: every project has all of them. A greenfield project establishes every one from day zero; an existing application adopts them in approved stages. Either path counts as established only when every Gate in the Gate Floor is adopted.

Both starting paths use these same Contracts. Adoption records adoption criteria for each Gate - its approved scope, cadence, and any specific tolerated findings in a tolerance policy - but it never redefines a Contract, weakens its intent, or creates a second set. The Contract remains the obligation.

An existing application carries legacy debt, so adoption also records which existing violations its criteria tolerate. That record never turns a count, a path, or a regenerated snapshot into permission to add new violations; the rules below keep every tolerated finding specific and visible.

## Rules for every Gate

- **Deterministic.** The same tree gives the same result everywhere. Every tool is pinned to an exact version: language dependencies through the lockfile, standalone binaries through a declarative version manager.
- **Configured in code.** Thresholds, scopes, and rules live in versioned config files. Guides point at those files.
- **Red means non-zero.** A violation makes the Entry Point exit non-zero and names the Gate and the offending location.
- **Warnings are errors.** A reported finding either fails the Gate or is tolerated as a specific entry in its Gate's tolerance policy. A target or rule excluded as declared scope reports no finding and is not a tolerance entry: the next rule states what an exclusion may cover.
- **Scope is declared.** A rule or traversal target is excluded in versioned config; the change that adds the exclusion states why in its commit message or a comment where the format allows one. A traversal exclusion may cover third-party code, generated or derived output, or a non-production target such as tests, fixtures, or tooling; it never covers a first-party production source target the Gate's Contract measures. A rule-level exclusion states its reason and does not narrow the target set. An exclusion is declared before the Gate reports a finding there; a target the Gate has reported a finding in is not later excluded: that finding is tolerated or fixed.
- **Tiered.** Fast Gates run in both Entry Points. Full Gates run only in the full Entry Point, which CI calls for a change and which the approved cadence calls integrally. Validation by change reports any Gate with no affected input as not applicable.
- **Core thresholds.** Where a contract sets a stricter threshold for core, the Gate config applies it to the modules of core contexts.
- **Third-party code.** Exclude it from traversal, never from rule targets: an exclusion that hides a target also hides the violation. A rule that depends on matching the target path must still see the dependency it forbids.
- **Own level.** A Contract's obligation stops at its own level; the Gherkin obligation on e2e adds none to unit or integration tests.
- **Honest state.** Every claim about a Gate uses the state vocabulary below.

## Execution modes

The full Entry Point has two modes. **Validation by change** is the mode CI calls for a change. **Integral validation** is the mode the approved cadence calls. Both run the same Gates with the same pinned tools, thresholds and Gate Proofs; they differ in which checks run, over which scope, and in what the result may claim.

- **Deterministic, versioned selection.** Versioned policy in the repository names every check, its tier, which changes make it apply, the scope it verifies, its cadence, and its estimated cost, together with the project's validation budget. Equivalent changed trees under the same policy select the same checks over the same scopes, and a result records the policy version it used.
- **Dependents are affected.** The affected scope is the changed files plus the files that depend on them, established from the project's dependency information. The selection includes verification of those dependents instead of stopping at the edited directories.
- **Shared configuration and dependencies widen it.** A change to shared configuration, a manifest or lockfile, a Gate's configuration, or the selection policy itself widens the selection to every applicable check over its whole input. A small-looking diff is not evidence of small impact.
- **Missing impact information widens it too.** An unresolvable comparison base, a dependency the graph cannot place, or any other impact the policy cannot establish widens the selection. Missing information is not read as independence.
- **The budget belongs to the project.** The maintainer approves a validation budget during adoption and it lives in the versioned policy; there is no universal CI target. Required validation wider than the budget is inconclusive: the Entry Point exits non-zero, reports the scope it could not verify, starts none of the expensive checks, and names the decision needed to proceed. It never silently skips a check and never launches an unapproved expensive run.
- **Periodic execution is explicit.** A check with no reliable reduced scope may run only under integral validation, at the cadence the policy records. The policy also records the protection the check gives between executions and the residual risk in between. Validation by change omits it and reports that fact with the last integral result; integral validation runs it.
- **Periodic failures are consequential.** The last integral result is published where validation by change can read it, in whatever transport the project's CI provides for its records. A change that verifies files in a failed check's scope is not reported green: the failure is reported and its scope requires treatment. A demonstrably independent change may proceed with the failure still reported. When the relationship cannot be established it is treated as uncertain impact and widens the selection.
- **Results say what they covered.** A result reports the checks that ran and the scope each verified, the checks that did not apply, the checks left to periodic execution, failures, and an inconclusive outcome, each distinctly. A green validation-by-change result names its scope and never claims or implies that the whole application was verified. A green integral result says every Gate ran over its whole input; it is a result of that run, not permanent certification.

The modes are the full Entry Point's two ways of running, not a catalogue of per-check commands: a Guide names the Entry Points, and the check list, impacts, costs, cadence and budget stay in executable policy the Guide points at.

## Gate states

- **Adopted**: the Gate actually runs under the approved scope and cadence (the day-zero defaults on the greenfield path, the adoption criteria on the adoption path), enforces its Contract under those criteria, and has a repeatable Gate Proof whose violation - outside any tolerated finding - turns the appropriate Entry Point red because of that Gate. A green run that does not meet all three is not adoption.
- **Pending**: the Gate is not adopted and nothing outside the work prevents it from being adopted. Missing, unexecuted, unproven, not-yet-in-scope, and vacuously passing Gates are pending. A check passes vacuously when it reports success without exercising its Contract: no meaningful input, an empty selection, a skipped suite, or a result that cannot fail. A pending Gate is not protection; its absence is reported, not hidden.
- **Blocked**: the Gate cannot run because the environment, a missing tool, a missing decision, or another external dependency prevents it. Record what the maintainer must provide. A blocked Gate is not adopted, and scheduling it later does not make it adopted.

A run can be green while its Gate remains pending: green is a result, not a state. Do not claim a Gate is adopted because it is configured, because it is on a schedule, because a raw check passed, or because it passed under a scope the maintainer did not approve.

## Adoption criteria

Adoption criteria are the approved scope, cadence, and specific tolerated findings the maintainer accepts for a Gate. They specialize how its Contract applies to this application - which code or contexts a Gate covers, within the limits the Scope rule declares, when it runs, and which present findings it tolerates - and never relax the Contract's intent or replace its acceptance criteria. A Gate that does not run under the approved criteria, or that passes vacuously, remains pending.

An existing tool or check that satisfies its Contract under those criteria is retained. A replacement is proposed with its reason, compatibility cost, and migration work, and made only after the maintainer approves it.

An adopted Gate is proved against the criteria, not around them: its Gate Proof introduces a violation the Gate must reject, outside any tolerated finding. A proof whose violation is itself a tolerated finding shows that the Gate tolerates what it was told to tolerate, not that it rejects what it must reject.

### Tolerated findings

Adoption criteria may accept existing violations. Each violation the criteria accept is a **tolerated finding**, recorded in the Gate's tolerance policy as part of a reviewed change, under these rules:

- **Specific.** A tolerated finding names its finding identity: the Gate, the rule or check that reported it, the location it occupies (the file plus the symbol, declaration, or the tool's own stable fingerprint), and the measured value or severity when the Gate measures one. A path, a directory, a rule, a severity, or a number of findings is not a tolerated finding.
- **One entry, one finding.** The Gate matches each reported finding to one entry and each entry to one reported finding. A finding with no entry fails, even when another tolerated finding disappeared in the same change; once a tolerated finding disappears its entry is void, so a later return fails even if the entry was not yet removed; two reported findings under one entry fail; and a tolerated finding that grows - a higher measured value, a higher severity, or another occurrence at the same place - fails, except a security finding the Security rule tolerates by explicit decision.
- **Tightening is reviewed.** Every change to an entry is a change to the adoption criteria, reviewed like code and approved as the plan was; the tolerance policy records the approved set. A reviewed change never adds one for a violation that appeared after adoption began and never raises one, except the security decision the Security rule allows, so a later or worse violation the Security rule does not tolerate is fixed rather than tolerated. A run never adds, removes, or rewrites an entry, so neither a failing nor a passing run can regenerate the tolerance policy. When a change removes or lowers a tolerated finding, the same reviewed change removes or lowers its entry; until it does, the Gate fails that entry. When a reviewed change only moves or renames the debt-bearing code, the same reviewed change re-identifies that entry at its recorded rule and measured value, which neither adds nor raises a tolerated finding.
- **A finding, not a place.** A tolerated finding accepts the named finding at its recorded value, not the place it lives. New code is held to the Contract's normal limits, other rules apply at that location, and changing code that carries a tolerated finding is allowed as long as no tolerated finding worsens and no new finding appears, except a security finding the Security rule tolerates by explicit decision; an improvement that lowers a tolerated finding still tightens its entry in the same reviewed change.
- **Security.** A security finding - a secret, or a vulnerability in a locked dependency - is either removed, or tolerated by an explicit human decision recorded beside its entry in the same tolerance policy. A revoked secret that history still contains, or an advisory with no fixed version, remains a finding and is tolerated only that way. A security finding is the one finding a reviewed change may add or revalue after adoption began, and only by that decision, recorded beside each entry it adds or revalues. A severity threshold, a scanner default, or an absent finding is not that decision.

A Gate matches entries against the findings it reports in the scope its run analyzed. An entry whose recorded location that scope covers, whose rule the run exercised, and which it no longer reports fails there as stale. An entry outside the analyzed scope is not stale: the mode that analyzes that scope matches it, and integral validation, which gives each Gate its whole input, matches every entry.

A tool's own exclusion format, such as an ignore file, is a tolerance policy only when each entry identifies one finding as these rules require and the file changes only by review; a count per file, rule, or run, or a file the tool rewrites on its own, does not qualify. Tolerated findings are Gate configuration, so they live in the Gate's tolerance policy: a versioned config file, one per Gate or one shared file keyed to its Gate, beside its thresholds and scopes; the approved plan names what a Gate accepts when the plan is approved, the policy holds the current set, and a Guide points at it instead of listing it.

No owner, expiry, or separate risk register is added: the reviewed change to the policy is the record. Legacy debt is every violation of a Gate Contract present when adoption begins, as the inventory records it. The approved plan names the legacy debt it accepts; legacy debt the plan does not name is not accepted, and is fixed or added to the plan by an approved amendment. A violation that appears after adoption began is fixed rather than tolerated, except a security finding the Security rule tolerates by explicit decision.

## Observed behavior

The application's observed behavior is the adoption path's regression contract. The test Gates pin it down; they do not audit its business correctness.

- **Characterize, do not correct.** A regression test records what the application does today, including behavior that looks surprising but is stable, so a change that alters it fails instead of passing unnoticed. A passing regression test says the behavior is unchanged, not that it is right.
- **Bounded investigation.** A failing suite is investigated within the stage's approved budget and ends in one of three ways: a fix that preserves the behavior the test asserts, an expectation update the maintainer approves before it records current behavior, or a pending or blocked Gate. A count of failing assertions is never an accepted reference, and no suite becomes adopted by the number of failures it still has.
- **Localized decision.** Exceptionally strong evidence of an obvious error - for example, the application visibly breaks a contract it states itself - opens one localized decision for the maintainer: fix it as its own reviewed change, or record the observed behavior as intended. It never triggers an automatic correction and never stops adoption work that does not depend on it. The decision is recorded beside the test or behavior it concerns, and adds no owner and no expiry.
- **Missing evidence is not adoption.** A missing test or an unavailable tool leaves its Gate pending - blocked when the environment is what prevents it - and never adopted; a suite that cannot execute is pending or blocked as the Gate states say. Tolerating the absence is not adoption.

## Establishment

A Harness is established when every Gate in the Gate Floor is adopted. Establishment does not require eliminating legacy debt or meeting every greenfield default threshold: tolerated findings the adoption criteria accept do not prevent it. A pending or blocked Gate does prevent it, and the final report names that Gate and why. Establishment is a claim about what runs and what was proved, not about how clean the application is.

## Rules for every Gate Proof

- **One violation.** The proof's tree carries exactly one deliberate violation - the smallest its Gate exists to catch, and outside any tolerated finding the approved criteria accept (the greenfield path accepts none) - and the Entry Point of the Gate's tier exits non-zero naming that Gate. Several violations in one tree, or a red Gate that is not the Gate under proof, prove nothing.
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
- **Passes when**: the mutation score is at least **80%** overall and at least **90%** in core contexts. Validation by change mutates only code changed relative to the base branch (`main`, or `MUTATION_BASE` when the environment sets it), which on day zero is all of it; the changed set includes the working tree and untracked files, not only commits. The whole-codebase mutation is a [periodic check](#execution-modes): validation by change reports it instead of running it, and integral validation runs it under the approved cadence. When the mutation tool has no per-context threshold, a wrapper reads its machine-readable report and applies the overall and core limits itself. When the changed set cannot be established - for example, no resolvable base branch, no earlier commit to compare against, no shared history with it, or files that cannot be listed or resolved - the Gate states that in its own output and mutates the whole codebase. That is a widening of scope, not a finding, so it does not fail the Gate, and the thresholds still apply to everything mutated. When HEAD is the base branch's own tip, the change to measure is what landed with the tip commit: the tip against its first parent. A push that lands several commits therefore measures only the tip; the scheduled whole-codebase run covers the rest.
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
- **Passes when**: zero known vulnerabilities of high or critical severity exist across all locked dependencies. A specific advisory with no fixed version remains a finding and is tolerated only by the explicit decision the Tolerated findings rules require.
- **Tier**: full.
- **Gate Proof**: lock a dependency version with a published critical advisory.

## Secrets

- **Intent**: keep credentials out of the repository.
- **Passes when**: the scanner finds zero secrets in the working tree and in history. A secret that cannot be removed from history is revoked; the remaining historical finding is tolerated only by the explicit decision the Tolerated findings rules require.
- **Tier**: fast.
- **Gate Proof**: add a file containing a well-formed fake cloud access key.

## Avoided terms

- **Intent**: keep the code speaking the glossary's language.
- **Passes when**: no identifier in source code contains a term listed under `_Avoid_` in `GLOSSARY.md`. Matching is case-insensitive on whole words, after splitting identifiers on camelCase, snake_case, and kebab-case boundaries. The Gate reads `GLOSSARY.md` directly, so the list exists in one place. A term that the ecosystem also uses as an identifier, such as `Instance` in `toBeInstanceOf`, cannot be enforced this way; prefer terms the stack does not already speak.
- **Tier**: fast.
- **Gate Proof**: rename a domain identifier to an avoided synonym.

## Guide pointers

- **Intent**: keep every Guide pointing at code that exists.
- **Passes when**: every relative link and file path in `AGENTS.md`, `GLOSSARY.md`, `docs/guides/`, and `docs/adr/` resolves, and every command a Guide names is one of the two Entry Points or a mode of the full Entry Point. A command is a tool name followed by an argument; a bare file path that starts with a tool name is not a command.
- **Tier**: fast.
- **Gate Proof**: point a Guide link at a file that does not exist.
