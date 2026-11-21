<!-- Copied from Sanmoo/software-factory-durable@595f382 (branch acceptance/adoption-2026-11-21); relative links point at that commit. -->

# Interview answers

## Adoption

Confirmed by the maintainer in the adoption interview of 2026-11-21, numbered as in the skill's Adoption interview. Lettered items refine a decision.

1. Deliverable and outermost edge: the `factory` CLI of the built release tarball. GitHub behind the existing local fake `gh` fixture, models behind scripted providers; real GitHub and models stay in the operator-authorized qualification recipes.
2. Domain: core = control, workers; supporting = sandbox, issue-tracker, code-repository, records; generic = protocol, platform/github, platform/host; shared kernel = contracts; entrypoints = composition roots. Mutation's core threshold applies to src/control and src/workers.
3. Boundaries: the dependency-cruiser map is the declaration, `cli-workers-setup-only` carve-out included; docs/development.md:126-127 is stale prose, fixed when the architecture Guide is reconciled.
   Naming: the factory's domain keeps "harness" and "gate" in its own sense. Adoption's Guides say "engineering harness" and "quality gate", never bare. GLOSSARY.md holds the PRD §3 product terms with their English identifiers and _Avoid_ lists; it adds no new domain model.
4. Regression contract: the current test:ci suite as-is; journey-composed and release-install/artifact/upgrade are the highest-priority workflows. A test failing at the pinned tree is investigated within 1 hour per stage, else its Gate stays pending. No new characterization tests unless a stage changes an unpinned workflow.
5a. Format: adopt a pinned formatter and reformat the whole tree once, as its own approved stage commit recorded in .git-blame-ignore-revs. No tolerated Format findings.
5b. Lint/Static metrics: retain ESLint 10.14.0 and its rules; add typescript-eslint recommended and complexity 10; add jscpd for duplication (3%). Existing findings become tolerated findings named in the plan.
6. Entry Points/CI: retain test:fast/test:ci names. The local supervisor's test:ci under its machine lock is the change-mode run ("CI"); the installed systemd nightly is the integral cadence. GitHub Actions keeps only the documentary job.
7/8a. Measure tolerated-finding candidates now, on a disposable clone outside the application (no test suite, no mutation).
E2E: @cucumber/cucumber pinned; features in Portuguese Gherkin (`# language: pt`), matching PRD/spec vocabulary; the maintainer is the business reviewer and approves scenarios before step definitions.
8b. Budget: change-mode validation ≤ 15 min wall clock; integral validation nightly 03:30 on the systemd timer, whole-codebase mutation included.
8c. Stage order: S1 existing fast Gates (Types, Context boundaries, Dependency rule, cycles) + Entry Point modes/selection policy + Guides/GLOSSARY; S2 Format reformat + Lint/complexity/duplication + Secrets + Avoided terms; S3 Unit/Integration split + Vulnerabilities; S4 E2E Gherkin; S5 Mutation.
Measurement (disposable clone at eafcb0a, Node 24.21.0): tsc 0 errors; depcruise 0 violations; ESLint (current rules) 0; npm audit 0 high/critical (5 moderate, minimatch GHSA-g3hv-75wg-m249 via eslint); prettier 3.9.10: 602 files differ; ESLint + typescript-eslint 8.72.1 recommended + complexity 10: complexity 357 src / 263 test / 8 scripts, unused-vars 24 src / 47 tests+scripts, prefer-const 3 / 25, no-explicit-any 9, no-this-alias 2; jscpd 5.4.2: src 1.20%, src+test 9.35% (956 clones); gitleaks 8.30.1: 8 tracked-tree, 25 all-refs history, all synthetic fixtures or public SSH host-key fingerprints.
8d. Static metrics scope: src/ + test/; scripts/ declared out of scope (tooling).
8e. Lint: fix all 110 non-complexity findings in S2 (reviewed change, regression suite stays green); Lint tolerates nothing.
8f. Secrets: tolerate each of the 25 history fingerprints in .gitleaksignore by explicit maintainer decision recorded beside each ("synthetic fixture / public host-key fingerprint, no credential").
8g. Levels: a versioned per-file `level` in the runner's policy (no file moves); a check enforces that unit files import no fs/child_process/net.
8h. Duplication: no tolerated clones; resolve duplication in src/ and test/ to ≤3% in its own stage. In this disposable run that stage is recorded as pending, so Static metrics stays pending.
8i. Mutation: no tolerated mutants; if the first integral measurement is below 80% overall / 90% core, Mutation stays pending until tests raise it.
8j. GLOSSARY.md _Avoid_: Work → Job; Slot → Seat, Lane; Repair → Hotfix. Blocker is not avoided. The single `job` identifier is renamed in S2.
8k. Complexity: no tolerated findings; resolved by refactoring in the same stage as duplication (S6), pending in this run.
8l. Secrets fixtures: S2 rewrites the 8 synthetic tokens in the tracked tree to strings gitleaks does not match, in the reformat commit, behavior preserved; only the 25 historical findings stay tolerated.
9. Plan approved by the maintainer on 2026-11-21, as recorded in ADOPTION-PLAN.md.
8m. Amendment (S2, 2026-11-21): 'lane' is removed from GLOSSARY.md's _Avoid_ lists: the test runner speaks it in another sense (29 identifiers such as LanePlan), which the Avoided terms Contract says cannot be enforced. No code is renamed and nothing is tolerated. 'job' was first removed too, on a scan whose bare-scanner tokenizer read string text as identifiers; with a full parse it has no identifier, and the maintainer restored it.
8n. Amendment (S2, 2026-11-21): the Secrets quality gate scans the working tree and the history reachable from HEAD, not every local ref. Scanning all refs made the result depend on which branches exist on the machine (a false positive in unpublished v2-lambda branches turned the tree red), which breaks determinism. Correction recorded with it: the HEAD-only scan reports 8 findings, not 25 (the interview's "HEAD-only" measurement had defaulted to --all). The 17 entries for commits outside HEAD's history are removed; the 8 remain, each with its decision.
8m–8n were confirmed by the maintainer during S2.
8o. S3 decisions (maintainer, 2026-11-21): the SDK-ownership rules (sdk:*-owner) bind production code under src/ only; tests and fixtures may load the real SDK they exercise. The records of S1 and S2 are corrected: Context boundaries and Dependency rule were pending (cruise blind spot), not adopted. The fast Entry Point runs the unit-level tests only; integration runs in the full Entry Point, and a filter may still reach any test.
