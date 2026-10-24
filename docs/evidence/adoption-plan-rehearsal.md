# Adoption-plan rehearsal on a disposable TypeScript example

This records the rehearsal required by [issue #13](https://github.com/Sanmoo/skills/issues/13): the adoption path of [bootstrap-harness](../../skills/bootstrap-harness/SKILL.md) must route an existing application through the lightweight inventory and the interview in _Adoption_ to a maintainer-approved, staged plan, without changing the copy's code, tests, or tooling.

The rehearsal used the [TypeScript Stack Example](../../examples/typescript/AGENTS.md) as the existing application. The example is already a complete Harness, so this is the clean case: the inventory must recognise what exists, the plan must preserve it, and the approval must not be a disguised excuse to change the application.

## Input and integrity

- Source: `examples/typescript` at the branch's starting commit `fc129fe1534f72ef7b5937396dec1861097199e6`.
- Copy: `git archive HEAD:examples/typescript | tar -x -C /tmp/adoption-rehearsal.XXcKyp`. The copy has 68 regular files (69 tree entries: `CLAUDE.md` is a symlink) and no `.git` or `node_modules`.
- Content manifest: [adoption-plan-rehearsal.manifest](adoption-plan-rehearsal.manifest) — 68 regular-file hashes plus the `CLAUDE.md` symlink target (69 entries), produced with `find . -type f` and `find . -type l`. Its aggregate hash is the Before/After value below.
- Before: `f1260175882e1b7fc5c27d88590665a121ceeb0971e18e56cbd5bc73fef44188`.
- After: `f1260175882e1b7fc5c27d88590665a121ceeb0971e18e56cbd5bc73fef44188`.
- Reproduction: the copy is ephemeral; a fresh `git archive fc129fe:examples/typescript` on 2026-10-24 produced the same manifest. `sha256sum -c` verifies the regular files, and the `link` line records the symlink target. The manifest does not claim modes or empty directories.

The first draft of this record used a regular-file-only manifest, whose aggregate was `5ef02abba37a7f5f5d543b858518ab5e8de76b4ffb454b58386e44a6e0cc463c`; the committed manifest adds the symlink target, so its aggregate is `f1260175…4188`. The Before and After manifest hashes are identical, and no write command ran inside the copy. The inventory, the confirmed answers, and the proposed plan were recorded in this file, outside the copy, following the skill's rule that those records stay outside the application until the plan is approved. The run ends at approval, so no record was written into the copy; the execution stage records the approved plan and answers before its first change. The copy's code, tests, and tooling are byte-identical before and after the rehearsal.

This file is point-in-time evidence about the fixed commit, not a Guide or a competing source of current truth; the source tree and its config remain the authority.

## Inventory (facts discovered by the agent)

The inventory was read-only and lightweight. It read the repository and the environment; it did not run the full test suite, mutation, or vulnerability scans, and it did not ask the maintainer for facts the repository answers.

- **Deliverable and outermost edge.** An HTTP service built by `npm run build` from `src/main.ts`; the e2e level drives the compiled service as a separate process over HTTP, against real Postgres.
- **Domain evidence and boundaries.** [GLOSSARY.md](../../examples/typescript/GLOSSARY.md) names two contexts: **Lending** (core) and **Catalog** (supporting). Their public interfaces are `src/lending/index.ts` and `src/catalog/index.ts`. The declared context map in `scripts/check-boundaries.mjs` is `catalog: []`, `lending: ["catalog"]`, `http: ["catalog", "lending"]`; `scripts/check-dependency-rule.mjs` keeps both domain models free of infrastructure. The source tree, the five ADRs, the test names, and the two Gherkin journeys agree with that model.
- **Observed behavior and regression priorities.** The existing tests are the observed behavior: 18 unit cases in `src/catalog/domain/book.test.ts` and `src/lending/domain/loan.test.ts`, 15 integration cases in the four `*.integration.test.ts` files, and two English Gherkin journeys in `features/library_lending.feature`. The journeys cover loan-and-return and the refused loan for a book the catalog does not hold; together they reach both contexts through HTTP.
- **Existing tools and checks.** Prettier 3.9.10, ESLint 10.13.0 with typescript-eslint 8.72.0, TypeScript 5.9.3, Vitest 4.1.12, Cucumber 13.3.0 with tsx 4.23.15, Stryker 10.0.0 with its Vitest runner, dependency-cruiser 18.7.0, jscpd 5.4.2, gitleaks 8.30.1, and npm audit 10.9.8. Versions are exact in `package.json` and `package-lock.json`; `mise.toml` pins Node 22.23.2, npm 10.9.8, gitleaks 8.30.1, and make 4.4.1.
- **Tests by level.** Unit and integration tests have separate Vitest projects in `vitest.config.ts`; the e2e level has `cucumber.mjs`, `scripts/run-e2e.mjs`, and the service and Postgres harnesses under `test/support/`.
- **Entry Points.** `Makefile` defines the fast Entry Point `make check-fast` and the full Entry Point `make check`. The full Entry Point builds before the e2e level and adds integration, mutation, and dependency vulnerabilities.
- **CI.** The containing repository's `.github/workflows/check.yml` runs the root Entry Point and a separate `example` job that runs `npm ci` and `make check` in `examples/typescript` with full history. `.github/workflows/mutation.yml` schedules the whole-codebase mutation run, and `.github/workflows/gate-proofs.yml` runs proofs on demand. The copy itself has no `.github/` directory: its CI arrangement lives in the containing repository.
- **Obvious gaps.** No Gate Contract lacks a tool or check. `GATE-PROOFS.md` records a complete proof table, but those are run evidence from the example's generation, not current certification of this copy. The copy has no installed dependencies and no CI of its own, so it depends on `npm ci`, `mise`, Docker, and the containing repository's workflows. Those are environment prerequisites and an arrangement fact, not a missing Gate.

Everything above is a fact the repository states; no maintenance decision was made while collecting it.

## Interview rounds and confirmed decisions

The rehearsal ran the interview from [INTERVIEW.md](../../skills/bootstrap-harness/INTERVIEW.md), section _Adoption_, after the inventory. The maintainer was not present in this disposable-copy session. The written decisions in [issue #2](https://github.com/Sanmoo/skills/issues/2) and [issue #13](https://github.com/Sanmoo/skills/issues/13) are the confirmed answers to the questions Q1-Q9 below; the agent discovered the facts and did not decide any of them. The plan's approval is recorded here. The skill still requires a live maintainer confirmation for a real application; the rehearsal does not add a second, weaker rule.

Confirmed answers:

1. **Q1:** Keep the HTTP service and its HTTP edge; the two Gherkin journeys are the e2e target.
2. **Q2:** Keep Lending (core) and Catalog (supporting), their names, their public interfaces, and their vocabulary.
3. **Q3:** Keep the declared context map and the dependency rule; no observed mismatch requires a boundary change.
4. **Q4:** Treat the existing tests and Gherkin journeys as the regression contract. No revalidation of business correctness.
5. **Q5:** Retain every existing tool and check; no replacement is proposed.
6. **Q6:** Retain `make check-fast`, `make check`, and the containing repository's workflow arrangement.
7. **Q7:** No application, test, or tooling change is required. The copy's CI arrangement is the containing repository's workflows; the inventory records it and no change is proposed.
8. **Q8:** The whole example; the existing full Entry Point and its current cadence; no universal CI target.
9. **Q9:** The plan below is approved before any change. Drafting it changed nothing in the copy.

One further confirmed decision fixes the route itself: the starting path is **existing application**, because the copy contains application source, tests, delivered behavior, and tooling.

## Approved adoption plan

The plan is staged and prioritized by the protection each stage buys. It is approved, not executed: this rehearsal ends at approval, so no Gate is claimed as adopted and no application, test, or tooling change was made.

### Stage 1 - Confirm and preserve the existing Harness (priority 1)

- **Scope:** the whole copy, both contexts, the HTTP edge, and the existing test levels.
- **Gate Contracts:** all fourteen, through the existing tool and check per Contract.
- **Guides:** keep `AGENTS.md`, `GLOSSARY.md`, `docs/guides/`, and `docs/adr/` as they are; no Guide work is proposed.
- **Changes:** none.
- **Validation budget and cadence:** no new run; the existing `make check-fast` and `make check` cadence.
- **Exit:** the inventory is confirmed and the retained tools and checks are recorded as the candidates for adoption.
- **Gate states at approval:** all fourteen pending. The tool exists, and `GATE-PROOFS.md` is prior run evidence, but adoption under this approved plan has not yet been established.

### Stage 2 - Re-prove every Gate under the approved scope (priority 2)

- **Scope:** the same whole copy; fast Gates in `make check-fast`, full Gates in `make check`.
- **Gate Contracts:** all fourteen, one Gate Proof at a time, with the violation named in the Contract and no other violation present.
- **Guides:** no change. Proof evidence goes to `GATE-PROOFS.md`; it is run evidence, not a new Guide.
- **Changes:** only the temporary proof violations and their reversion; no application, test, or tooling change is proposed.
- **Validation budget and cadence:** one Entry Point run per Gate, plus the existing full Entry Point on the final tree. The existing budget is the approved budget because the example is already sized for it.
- **Exit:** a Gate is adopted only after it runs under this scope and its proof turns the appropriate Entry Point red because of that Gate; a Gate that cannot run is blocked with the missing prerequisite.
- **Gate states after the stage:** adopted, pending, or blocked, one per Gate, recorded with its proof.

### Stage 3 - Report the final state (priority 3)

- **Scope:** the whole copy.
- **Gate Contracts:** all fourteen, reported by state.
- **Guides:** no change.
- **Changes:** none.
- **Exit:** report every Gate as adopted, pending, or blocked; the Harness counts as established only when every Gate in the Gate Floor actually runs under the approved scope and cadence and has its Gate Proof.

## What this rehearsal establishes, and what it does not

It establishes that the adoption path selects an existing application, produces a factual inventory without expensive analysis, records the confirmed decisions adapted to adoption, and reaches a staged, prioritized plan approved under the maintainer's written decisions, while the copy's code, tests, and tooling remain untouched.

It does not execute the plan. Gate adoption, Gate Proofs under the approved plan, establishment, and the final Gate-state report are the next stage of the work, tracked as [Sanmoo/skills#14](https://github.com/Sanmoo/skills/issues/14); this record makes no adoption claim for any Gate and no establishment claim for the copy. It also cannot demonstrate a pending-to-adopted transition: a Gate cannot be adopted before execution, and the later execution stage covers that transition.
