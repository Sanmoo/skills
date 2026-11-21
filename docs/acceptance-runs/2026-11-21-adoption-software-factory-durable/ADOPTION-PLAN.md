<!-- Copied from Sanmoo/software-factory-durable@595f382 (branch acceptance/adoption-2026-11-21); relative links point at that commit. -->

# Adoption plan: engineering harness for software-factory-durable

Status: **approved by the maintainer on 2026-11-21**, before any change to the application, its tests, or its tooling. Stage completion records follow each stage.
Pinned tree: `eafcb0ab3bd0156cea6af52bbb15fe0a0b6576ff`. Branch: `acceptance/adoption-2026-11-21` (disposable, never merged).
The confirmed answers, including the inventory measurements, are in `INTERVIEW-ANSWERS.md` under _Adoption_.

"Harness" and "gate" belong to the factory's domain (the agent runtime; Builder-declared validation commands). This plan and the Guides it writes say **engineering harness** and **quality gate**. Gate Contract names (Format, Lint, ...) are used as proper names.

## Gate Floor: current state

Every quality gate is **pending** at the pinned tree. A tool that already exists is not an adopted quality gate: none has a Gate Proof that turns an Entry Point red, and Lint, Guide pointers, and the test levels do not meet their Contracts.

| Quality gate | Existing check | State now | Stage |
|---|---|---|---|
| Types | tsc 6.0.3 strict (`tsconfig.json`), green | pending (unproven) | S1 |
| Context boundaries | dependency-cruiser 18.7.2 map (`.dependency-cruiser.cjs`), green | pending (unproven) | S1 |
| Dependency rule | `neutral-contracts`, `pure-rules-imports`, ESLint ambient bans in `src/control/rules`, green | pending (unproven) | S1 |
| Guide pointers | `scripts/agent-checks/check.mjs` (AGENTS.md, docs/agents only; no command check) | pending (partial scope) | S1 |
| Format | none | pending (missing) | S2 |
| Lint | ESLint 10.14.0, `no-restricted-syntax` only | pending (vacuous as a linter) | S2 |
| Secrets | none (gitleaks 8.30.1 on the host) | pending (missing) | S2 |
| Avoided terms | none; no GLOSSARY.md | pending (missing) | S2 |
| Unit tests | node:test suite, tiered by speed, not level | pending (no level declared) | S3 |
| Integration tests | same suite | pending (no level declared) | S3 |
| Dependency vulnerabilities | none (one manual audit on record) | pending (missing) | S3 |
| E2E tests | none (no Gherkin) | pending (missing) | S4 |
| Mutation | none | pending (missing) | S5 |
| Static metrics | cycles only (`no-cycles`); no complexity or duplication | pending (partial) | S6 |

Nothing is blocked at approval time. Environment checked: Node 24.21.0 via mise, `npm ci` with network, `/dev/kvm`, qemu, docker, gitleaks 8.30.1. Vulnerabilities needs the npm registry; without network it is blocked.

## Entry Points, modes, budget, cadence (all stages)

- **Fast Entry Point**: `npm run test:fast` (retained). A versioned `pre-commit` hook calls it; installing the hook (`core.hooksPath`) is an operator step, like the systemd units.
- **Full Entry Point**: the runner `scripts/test-runner/run`, retained, with its two modes:
  - validation by change: `npm run test:ci`. The local supervisor runs it under its machine lock before delivery and after rebase; that run is this project's CI (decision 6). GitHub Actions keeps only the documentary job.
  - integral validation: `npm run test:full`, called nightly at 03:30 by the versioned systemd timer.
- **Selection policy**: versioned code beside the runner, holding every check with its tier, the changes that make it apply, the scope it verifies, its cadence, its estimated cost, and the budget. Affected scope is the changed files plus their dependents from the dependency-cruiser graph, compared against one base (`main`, or `VALIDATION_BASE`). It widens on a manifest/lockfile, shared config, quality gate config, ignore file, CI/runner/policy change, or any impact it cannot place. Required validation over budget is inconclusive and starts nothing expensive.
- **Budget**: validation by change ≤ 15 min wall clock (the runner's `ci` budget goes from 600 s to 900 s). Integral validation: nightly, ≤ 2 h (`RuntimeMaxSec`).
- **Periodic checks** (integral only): whole-codebase mutation (S5), the sandbox real-disk and random-order passes already in `test:full`. Each states its protection between runs and its residual risk in the policy. The last integral result is published in the runner's state directory (`$XDG_STATE_HOME/software-factory/nightly-tests/`), where validation by change reads it. The policy's cadence is checked against the timer's `OnCalendar`.
- **Rehearsal**: an executable script outside both Entry Points rehearses the modes on a disposable copy (dependent caught without widening, shared config widens, over-budget is inconclusive, integral runs a periodic check change mode only reported).
- **Gate Proofs**: one executable proof file outside both Entry Points; each proof runs the Entry Point of its tier on a disposable copy with one violation, and its attribution rules are tested. Results go to `GATE-PROOFS.md`.

## S1: existing structural quality gates, modes, Guides

- **Scope**: whole repository; `src/`, `test/`, `scripts/` as each quality gate's Contract measures.
- **Contracts realized**: Types, Context boundaries, Dependency rule, Guide pointers; plus the Entry Point modes and selection policy.
- **Adoption criteria**:
  - Types: tsc strict over `src`, `test`, `scripts` (existing `tsconfig.json`), fast tier.
  - Context boundaries: the existing dependency-cruiser map is the context map, `cli-workers-setup-only` carve-out included; fast tier.
  - Dependency rule: domain model = `src/contracts` and `src/control/rules` (existing rules); fast tier.
  - Guide pointers: the existing documentary checker is retained and extended to GLOSSARY.md, `docs/guides/`, `docs/adr/` and to the command rule (a Guide names only the Entry Points and modes); it joins the fast Entry Point.
  - Cadence: every change; fast tier in both Entry Points.
- **Tolerated findings**: none (all four are green at the pinned tree).
- **Gate Proofs**: Types: pass a wrong-typed argument; Context boundaries: import a non-public module of another context; Dependency rule: import `node:fs` in `src/control/rules`; Guide pointers: point a Guide link at a missing file.
- **Tooling changes**: fast tier gains dependency-cruiser and the documentary checker (today ci only / GitHub only); runner gains the two modes' selection policy, inconclusive outcome, last-integral reporting; rehearsal script; proof file; `pre-commit` hook; `mise.toml` pinning gitleaks (Node stays in `.node-version`).
- **Guides** (written in Portuguese, like the existing ones; identifiers and quality gate names stay English):
  - `AGENTS.md` amended: Entry Points and modes, what green covers, code is the source of truth (GLOSSARY wins for naming), links to GLOSSARY, Guides, ADRs. `CLAUDE.md` symlink created.
  - `GLOSSARY.md` created: PRD §3 terms with their English identifiers; _Avoid_: Work → Job; Slot → Seat, Lane; Repair → Hotfix. Product vocabulary only; it adds no domain model (map.md:21 honoured).
  - `docs/guides/architecture.md` created from the architecture part of `docs/development.md` (that part then points at it; the stale CLI-imports prose is corrected).
  - `docs/guides/testing-strategy.md` replaces `docs/agents/testing.md` (moved and amended; AGENTS.md link updated).
  - `docs/guides/coding-standards.md` created (judgment only, pointers to formatter, linter, metrics config).
  - `docs/adr/` created: 0001 the local supervisor's `test:ci` is the change-mode CI; 0002 qualified terminology for the engineering harness.
- **Budget**: 1 working session; regression suite (`test:ci`) green after the stage.
- **Remains pending**: everything outside S1.

## S2: Format, Lint, Secrets, Avoided terms

- **Contracts realized**: Format, Lint, Secrets, Avoided terms.
- **Adoption criteria**:
  - Format: prettier 3.9.10 pinned, check mode, over `*.{ts,mts,cts,js,mjs,cjs}`; one approved reformat commit, listed in `.git-blame-ignore-revs`; fast tier; changed set in change mode, whole tree in integral.
  - Lint: ESLint 10.14.0 retained with its rules, plus typescript-eslint 8.72.1 `recommended`, over `src`, `test`, `scripts`; `--max-warnings 0`; fast tier. Complexity is **not** part of Lint (it is S6).
  - Secrets: gitleaks 8.30.1 over the working tree and the history reachable from HEAD (amended in S2: all local refs made the result depend on the machine's branches); fast tier; a wrapper matches findings to the tolerance policy by identity (commit, file, rule, line, column) and fails unmatched, duplicated, grown, or stale entries.
  - Avoided terms: a checker reading GLOSSARY.md's _Avoid_ lines, identifiers split on camelCase/snake_case/kebab-case, over `src`, `test`, `scripts`; fast tier.
- **Code changes**: fix the 110 typescript-eslint findings (24 unused-vars + 3 prefer-const in src; 47 unused-vars, 25 prefer-const, 9 explicit-any, 2 this-alias in tests/scripts); rename the single `job` identifier; rewrite the 8 synthetic tokens that gitleaks matches in the tracked tree to strings it does not match, in the reformat commit. Behavior preserved; `test:ci` must stay green.
- **Tolerated findings** (Secrets only; each with the maintainer's explicit decision "synthetic fixture or public SSH host-key fingerprint, no credential", recorded beside each entry in the Secrets tolerance policy):

| Commit | File | Rule | Line:column |
|---|---|---|---|
| `da556394ac37` | `.scratch/software-factory-v2/research/alpine-guest-evidence.json` | generic-api-key | 33:1168 |
| `da556394ac37` | `.scratch/software-factory-v2/research/alpine-guest-evidence.json` | generic-api-key | 33:1362 |
| `da556394ac37` | `.scratch/software-factory-v2/research/alpine-guest-evidence.json` | generic-api-key | 37:1168 |
| `da556394ac37` | `.scratch/software-factory-v2/research/alpine-guest-evidence.json` | generic-api-key | 37:1362 |
| `da556394ac37` | `.scratch/software-factory-v2/research/alpine-guest-evidence.json` | generic-api-key | 37:1922 |
| `da556394ac37` | `.scratch/software-factory-v2/research/alpine-guest-evidence.json` | generic-api-key | 37:2116 |
| `6be181a31186` | `test/control/budget-doubles.ts` | generic-api-key | 71:31 |
| `c14a6f1d0a5d` | `test/control/budget-doubles.ts` | generic-api-key | 71:31 |
| `48eb6e96a546` | `test/control/continuation-flow.test.ts` | generic-api-key | 42:31 |
| `5befa5359532` | `test/control/continuation-flow.test.ts` | generic-api-key | 42:31 |
| `0b7adf11c59c` | `test/control/cycles-flow.test.ts` | generic-api-key | 33:66 |
| `dc080a446b6a` | `test/control/cycles-flow.test.ts` | generic-api-key | 33:66 |
| `fee42f48584e` | `test/control/cycles-flow.test.ts` | generic-api-key | 33:66 |
| `a719df2e0e60` | `test/control/delivery-control-flow.test.ts` | generic-api-key | 33:66 |
| `d2696290750a` | `test/control/delivery-control-flow.test.ts` | generic-api-key | 33:66 |
| `04f4878f0360` | `test/control/question-flow.test.ts` | generic-api-key | 40:31 |
| `bed2a2edda9a` | `test/control/question-flow.test.ts` | generic-api-key | 40:31 |
| `479b4c03659e` | `test/control/review13-question-flow.test.ts` | generic-api-key | 60:45 |
| `807f6798d600` | `test/control/review13-question-flow.test.ts` | generic-api-key | 60:45 |
| `1b5b6ab7a717` | `test/entrypoints/inspect29-qualification.test.ts` | jwt | 34:85 |
| `67151788ba76` | `test/entrypoints/inspect29-qualification.test.ts` | jwt | 35:85 |
| `67216d1b551a` | `test/entrypoints/inspect29-qualification.test.ts` | jwt | 35:85 |
| `f6b463c83399` | `test/entrypoints/inspect29-qualification.test.ts` | jwt | 35:85 |
| `0d2e225ffdd4` | `test/entrypoints/long34-provider.ts` | generic-api-key | 11:15 |
| `e9455b443a62` | `test/entrypoints/long34-provider.ts` | generic-api-key | 11:15 |

  Full 40-character commits are recorded in the policy. These are the only tolerated findings this plan names.
  Amended in S2 with the HEAD scope: only the 8 entries whose commits are in HEAD's history (`0d2e225ffdd4`, `f6b463c83399`, `dc080a446b6a`, `a719df2e0e60`, `807f6798d600`, `48eb6e96a546`, `6be181a31186`, `04f4878f0360`) stay in the policy; the 17 outside it were removed by the same approved amendment.
- **Tightening rule**: an entry is removed in the same reviewed change that removes its finding; a stale entry fails. A new security finding after adoption began is tolerated only by a new explicit decision recorded beside it; any other new finding is fixed.
- **Gate Proofs**: Format: misindent one line; Lint: add an unused variable; Secrets: add a file with a well-formed fake AWS access key; Avoided terms: rename a Work identifier to `job`.
- **Guides**: `docs/guides/coding-standards.md` gains pointers to the prettier and ESLint config.
- **Budget**: 1 working session plus one `test:ci` run after the reformat and after the lint fixes.

## S3: Unit and Integration levels, Dependency vulnerabilities

- **Adoption criteria**:
  - A versioned `level` (unit or integration) per test file in the runner's policy; no file moves. A check enforces that unit files import no `node:fs`, `node:child_process`, `node:net`, or a process-spawning helper.
  - Unit tests: every unit-level file passes; fast tier. Integration tests: every integration-level file passes, with the local fake `gh` and scripted model providers as the only doubles (third-party systems at the boundary); full tier. The `gondolin.test.ts` VM qualification stays outside the levels (operator-authorized).
  - Dependency vulnerabilities: `npm audit --audit-level=high` with the npm pinned in `engines` (11.19.0) over the lockfile; full tier; zero high/critical today, so no tolerated findings.
- **Regression contract**: the current `test:ci` suite; a test failing at the pinned tree is investigated within 1 hour, else its quality gate stays pending.
- **Gate Proofs**: Unit: invert a condition in a `src/control/rules` operation; Integration: break a mapping in an adapter (e.g. `src/platform/github`); Vulnerabilities: lock a dependency version with a published critical advisory.
- **Guides**: `docs/guides/testing-strategy.md` gains the level definitions and pointers to the level policy.
- **Budget**: 1 working session.

## S4: E2E tests (Gherkin)

- **Adoption criteria**: @cucumber/cucumber 13.3.0 pinned; features in Portuguese Gherkin (`# language: pt`); each scenario drives the `factory` CLI of the built release tarball (the existing release fixture build), with the local fake `gh` and scripted model providers behind it; readiness from the controller's socket/status, never sleeps; the full Entry Point builds the release before this level. The executor is verified to fail on no scenarios, an undefined/pending step, a wrong assertion, and an artifact that does not start. Full tier.
- **Human review**: the maintainer approves the scenario set before any step definition is written. Proposed portfolio (2–3 journeys): ticket admitted to delivered (admission, Builder, reviews, draft PR, ready, merge confirmed, cleanup); a question suspends and resumes Work; a required check failure produces a Repair.
- **Gate Proof**: remove one CLI command's route where the release composes it (e.g. `status` in `src/entrypoints/cli.ts`), so no lower-level test sees it first.
- **Budget**: 2 working sessions; release build ≤ 3 min inside the change-mode budget, else E2E runs only under integral validation and the plan is amended.

## S5: Mutation

- **Adoption criteria**: Stryker 10.1.1 pinned, tap runner over node:test; validation by change mutates the changed set relative to the shared base; whole-codebase mutation is periodic (nightly). Thresholds 80% overall, 90% core (`src/control`, `src/workers`), applied by a wrapper over Stryker's JSON report. No tolerated mutants: below threshold, Mutation stays pending until tests raise the score.
- **Gate Proof**: delete the assertions of every test covering one core file (e.g. a `src/control/rules` file) at every level the mutation run executes, with that file as the declared scope.
- **Budget**: 1 working session; the nightly whole-codebase run must fit in 2 h, else Mutation stays pending and the plan is amended.

## S6: Static metrics (complexity and duplication)

- **Adoption criteria**: complexity ≤ 10 per function (ESLint `complexity`), zero cycles (existing `no-cycles`), duplication ≤ 3% (jscpd 5.4.2), over `src/` and `test/`; `scripts/` declared out of scope (tooling). **No tolerated findings**: today's 620 complexity findings and 956 clones (9.35%) are resolved by refactoring, behavior preserved under the regression suite.
- **State in this run**: **pending**. The refactor belongs to the real adoption on `main`, not to this disposable branch. Static metrics is not wired into either Entry Point until this stage runs, so the final Entry Point is not red for it.

## Establishment expectation

At the end of this run Static metrics is pending by approval, so the engineering harness **will not be established**; the final report will say so and name every other quality gate's state.

## Stage records

### S1 — completed 2026-11-21

- **Changed**: the runner's two modes and versioned selection policy (`scripts/test-runner/policy.json`, `selection.ts`, `changes.ts`, `architecture.ts`; `ci` = validation by change with the 900 s budget, `full` = integral validation that runs every check and records its result); dependency-cruiser and the documentary checker joined the fast Entry Point; the documentary checker now covers GLOSSARY.md, `docs/guides/`, `docs/adr/`, backticked paths, and the Entry-Point-only command rule; the nightly unit and script validate `main`; versioned `pre-commit` hook; `mise.toml` pins gitleaks; the rehearsal (`scripts/test-runner/rehearse-modes.ts`) and the Gate Proof file (`scripts/test-runner/gate-proofs.ts`, attribution tested in `test/runner/proof-attribution.test.ts`); Guides: AGENTS.md amended, CLAUDE.md, GLOSSARY.md, `docs/guides/{architecture,coding-standards,testing-strategy}.md` (the last moved from `docs/agents/testing.md`), ADRs 0001–0002.
- **Regression investigation**: at the pinned tree `test:ci` was red: `test/sandbox/audited-vfs-guard.test.ts` and `test/sandbox/sandbox-adapter-diagnostics.test.ts` read the hash-pinned gondolin package from a fixed path into a sibling worktree that no longer exists (`test/sandbox/fixtures/audited-vfs-manifest.ts`). Fixed within the budget by resolving that root from the checkout's own `node_modules`; the recorded hashes still pin every file, so the asserted behavior is unchanged.
- **Adopted**: Types, Context boundaries, Dependency rule, Guide pointers — proofs in [GATE-PROOFS.md](https://github.com/Sanmoo/software-factory-durable/blob/595f382/GATE-PROOFS.md).
- **Rehearsal of the modes**: 4/4 scenarios passed (dependent caught without widening; shared configuration widens; over budget is inconclusive and starts nothing; integral runs the periodic checks change mode only reports).
- **Remains pending**: Format, Lint, Secrets, Avoided terms (S2); Unit tests, Integration tests, Dependency vulnerabilities (S3); E2E tests (S4); Mutation (S5); Static metrics (S6).

### S2 — completed 2026-11-21

- **Changed**: approved one-off reformat with Prettier 3.9.10 (`5dff6f6`, in `.git-blame-ignore-revs`), the 8 synthetic tokens split so gitleaks no longer matches them, and 6 source-shape tests reading source through `test/architecture/source-text.ts` (approved expectation update); Format, Secrets (`scripts/test-runner/secrets.ts`, policy `scripts/test-runner/secrets-tolerated.json`) and Avoided terms (`scripts/test-runner/avoided-terms.ts`) wired into both Entry Points; ESLint adds typescript-eslint 8.72.1 `recommended`; the 110 findings fixed, except that the project's leading-underscore convention for bindings kept on purpose is configured on `no-unused-vars` (49 of them were such bindings, so the 110 became 61 fixes).
- **Amendments approved during the stage**: 'lane' leaves GLOSSARY.md's _Avoid_ lists ('job' was removed on a faulty scan and restored); Secrets scans the history of HEAD instead of every local ref, and its policy keeps the 8 entries in that history (the 17 others were outside the tree).
- **Not needed**: no `job` identifier existed to rename (the one occurrence is a comment in `src/sandbox/stop.ts`).
- **Adopted**: Format, Lint, Secrets, Avoided terms; Types, Context boundaries, Dependency rule and Guide pointers re-proved on this tree — [GATE-PROOFS.md](https://github.com/Sanmoo/software-factory-durable/blob/595f382/GATE-PROOFS.md).
- **Remains pending**: Unit tests, Integration tests, Dependency vulnerabilities (S3); E2E tests (S4); Mutation (S5); Static metrics (S6).

### Correction of the S1 and S2 records (recorded during S3, 2026-11-21)

The S1 and S2 records reported Context boundaries and Dependency rule as adopted. They were not: `.dependency-cruiser.cjs` excluded `(^|/)dist/` and `.scratch/` from the cruise, which also hid every package whose entry point lives in a `dist/` directory (`yaml`, `@earendil-works/pi-durable`, `@earendil-works/chord`). A domain module importing such a package passed (Dependency rule passed vacuously for package imports), and the `sdk:*-owner` rules could never see their targets. Both were **pending** through S1 and S2; the earlier Gate Proofs used source-path violations and could not show it. S3 fixes the exclusion (root-anchored; third-party code not followed but visible) and re-proves both.

### S3 — completed 2026-11-21

- **Changed**: `test/levels.json` declares the unit level (34 files after the cruise fix; the boundaries cruise fails a declared unit test that reaches runtime I/O); the policy splits the suite into `unit-tests` (fast) and `integration-tests` (full), and each failing file is reported under its level's quality gate; `npm audit --audit-level=high` runs before the tests when the plan selects it (lockfile or manifest change, widening, integral); the dependency-cruiser exclusion fix and SDK-ownership scope above; the fast Entry Point runs the unit level; the testing-strategy Guide states the levels.
- **Adopted**: Unit tests, Integration tests, Dependency vulnerabilities; Context boundaries and Dependency rule adopted now (see the correction above); every adopted quality gate re-proved at `35ec2b8` — [GATE-PROOFS.md](https://github.com/Sanmoo/software-factory-durable/blob/595f382/GATE-PROOFS.md).
- **Rehearsal of the modes** on the final runner: 4/4 scenarios passed.
- **Remains pending**: E2E tests (S4), Mutation (S5), Static metrics (S6).

### S4 — blocked (2026-11-21)

E2E tests is **blocked**. Its Contract needs scenarios that drive the built release through the `factory` CLI and together reach every bounded context. The release fixture carries synthetic, non-bootable guest assets, and a Builder or reviewer run needs real model sessions under the operator's per-run authorization (`docs/agents/experiment-proofs.md`): workers, the sandbox runtime and code-repository publication cannot be reached. The maintainer decided not to build a partial Gherkin suite. **To unblock**: a release built with the real, bootable guest assets; model credentials; and per-run authorization for the E2E run.

### S5 — pending (2026-11-21)

Mutation is **pending**: the approved criterion (the nightly whole-codebase run fits in 2 h) cannot be met. Stryker 10.1.1 instruments `src/` into 58,473 mutants (147 files, measured on a disposable clone). Its tap runner, the one that runs node:test, has no per-test coverage, so every mutant re-runs the whole selected test set: at about 3 s for the 34 unit-level files and concurrency 4, that is about 12 h; with the integration level (about 250 s), days. Nothing was wired. **Decision needed**: a runner with per-test coverage (which means a test-runner change), a longer periodic cadence and budget for the whole-codebase run, or an approved amendment of the scope.

### S6 — pending (2026-11-21)

Static metrics is **pending** by the plan's approval: the 620 complexity findings and the 9.35% duplication over `src/` and `test/` are to be resolved by refactoring in the real adoption on `main`, not on this disposable branch. Not wired into either Entry Point.
