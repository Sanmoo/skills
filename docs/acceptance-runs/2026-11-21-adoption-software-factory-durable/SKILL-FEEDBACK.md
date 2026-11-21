# What the adoption run exposed in the skill

The first acceptance run of `bootstrap-harness`'s adoption path, as [#24](https://github.com/Sanmoo/skills/issues/24) asked. Every skill-text gap below was fixed in [SKILL.md](../../../skills/bootstrap-harness/SKILL.md), [GATE-CONTRACTS.md](../../../skills/bootstrap-harness/GATE-CONTRACTS.md), [INTERVIEW.md](../../../skills/bootstrap-harness/INTERVIEW.md) or [GUIDES.md](../../../skills/bootstrap-harness/GUIDES.md) in the same change.

## The acceptance run

- **When and where.** 2026-11-21, in a fresh session. The skill text followed is Sanmoo/skills at `46a84d2`.
- **Target.** [Sanmoo/software-factory-durable](https://github.com/Sanmoo/software-factory-durable), pinned at its `main` HEAD `eafcb0ab3bd0156cea6af52bbb15fe0a0b6576ff`. The run worked on the disposable branch [`acceptance/adoption-2026-11-21`](https://github.com/Sanmoo/software-factory-durable/tree/acceptance/adoption-2026-11-21), which is pushed and never merged. Real adoption on the factory's `main` is a later, separate step with a fresh inventory.
- **Who.** An agent conducted the run; the maintainer answered the Adoption interview, approved the plan before any change, and approved every amendment during the stages.
- **Records.** The approved plan with its stage records is [ADOPTION-PLAN.md](ADOPTION-PLAN.md), the confirmed answers are [INTERVIEW-ANSWERS.md](INTERVIEW-ANSWERS.md), both as they stand at the end of the run. The Gate Proof record is the branch's [GATE-PROOFS.md](https://github.com/Sanmoo/software-factory-durable/blob/acceptance/adoption-2026-11-21/GATE-PROOFS.md); its proofs are executable in the branch's `scripts/test-runner/gate-proofs.ts` and the modes' rehearsal in `scripts/test-runner/rehearse-modes.ts`.
- **Outcome.** The run reached the adoption final report (A5). The full Entry Point ran on the final tree `595f382` in both modes:
  - validation by change was green: every applicable check over its whole input (the change widened), 1886 tests passing;
  - integral validation was red: every Gate's check passed and the whole suite passed (`integral-pass`, with the real-disk sandbox tests), but the `random-order` periodic check failed in three test files. `finite-qualification.test.ts` fails under the same seed on the pinned tree too, so it is legacy order dependence that only integral validation exercises: the factory's scheduled `full` run was versioned but its timer had never been installed on the machine, so no integral result existed before. Validation by change then read that result and refused the next change in its scope, as the periodic-failure rule requires.

  The red periodic check does not change a Gate state: Unit tests and Integration tests stay adopted, because they run and enforce their Contract under the approved criteria, and green is a result, not a state. The order dependence is legacy behavior awaiting the maintainer's treatment under the observed-behavior rules.

  Eleven of the fourteen Gates in the Gate Floor are adopted, each with a Gate Proof red for its own reason at `35ec2b8`. The commits after it change only records and the rehearsal script, not a Gate's analysis, its config or the proof file, so the proofs were not re-run on `595f382`. E2E tests is blocked, Mutation and Static metrics are pending, so the Harness is not established; the modes' rehearsal passed 4/4 on the final runner.

## Decisions the issue left open

- **Unexercised tolerance rules.** The inventory found real legacy debt for most of the tolerance rules, so no synthetic fixture was added. Exercised on real debt: finding identity with a non-unique tool fingerprint (gap 11), the explicit decision for security findings, and an approved amendment removing entries outside the analyzed scope. Unevidenced by real debt, recorded as such: a stale entry (only unit-tested in the branch, `test/runner/secrets.test.ts`), re-identification after a move or rename, and aggregate or per-mutant tolerance (the maintainer chose to resolve complexity, duplication and mutation rather than tolerate them).
- **Where the evidence lives.** Here, in `docs/acceptance-runs/`, and in the pushed disposable branch.

## Gaps and fixes

1. **A1 could not state current findings.** It asked for "the findings those checks already report" but allowed running nothing. Fixed: the existing cheap checks may run on a disposable copy during the inventory.
2. **The target's domain already owned the skill's terms.** "Harness" is the factory's substitutable agent runtime and "gate" a Builder-declared validation command. Fixed: the domain keeps its terms; the adoption's Guides qualify the skill's term (here "engineering harness", "quality gate"), recorded in an ADR (Adoption interview, domain understanding; GUIDES.md).
3. **The target's domain rejects a global glossary**, while Avoided terms reads `GLOSSARY.md`. Fixed: the glossary then records only the existing vocabulary, citing its source, with each term's identifier; it adds no model.
4. **Guide language.** The factory's Guides are Portuguese, its identifiers English. Fixed: Guides keep the existing Guides' language, identifiers keep the code's, and _Avoid_ lists name identifier words.
5. **CI was assumed to be a hosted provider.** The factory's integration check is a supervised local run under a machine lock. Fixed: a supervised local run can be the CI the Contract names, recorded in an ADR (Execution modes; Adoption interview, Entry Points and CI).
6. **Adoption forbade reformatting**, while the Format Contract passes only on a formatted tree and a format finding has no symbol-level identity. Fixed: a reformat is an approved stage of its own (A3), and the adoption path forbids reformatting only outside one.
7. **The cadence was checked against "the schedule CI runs"**; here a versioned systemd timer schedules integral validation. Fixed: the cadence is checked against whatever schedules integral validation.
8. **Aggregate criteria had no tolerance route** (duplication percentage, mutation score). Fixed: such a Gate tolerates unit findings (a clone, a surviving mutant) entry by entry and computes the aggregate over the rest, or stays pending.
9. **Tolerated findings had to be named before any tool existed to report them.** Fixed: with the maintainer's consent, the proposed tools run on a disposable copy before approval, with each measurement's exact scope recorded (A2).
10. **A reformat moves every line-based identity.** Fixed: the reformat stage comes before line-based identities are recorded (A3).
11. **A tool's fingerprint was assumed unique.** gitleaks' fingerprint is shared by several matches on one line (6 of the 25 first measured). Fixed: the identity adds what tells such findings apart, such as the column.
12. **Guide pointers' command rule forbade operational commands** a Guide legitimately names (`git push origin main`). Fixed: a command is one of the project's build, test or check tools, which the Gate's config lists.
13. **"HEAD is the base branch's own tip" also matched a new branch at the tip**, which then measured the tip commit instead of the work; the rehearsal exposed it. Fixed: the tip rule applies on the base branch itself or detached at its tip.
14. **An import graph misses runtime dependencies.** About 120 composition tests run the built entrypoints as processes. Fixed: a dependency the information cannot see is declared in the selection policy.
15. **The regression suite's first result had no place.** At the pinned tree the suite was red for an environmental reason (a fixture with an absolute path into a deleted worktree) the inventory could not see; this run found it only in S1, as its first full run. Fixed: the suite runs once on a disposable copy before the plan is approved (A2), so the plan knows it.
16. **A reformat broke 6 tests that assert the shape of source text.** Fixed: the reformat stage identifies those tests first, since their expectation update needs the maintainer's approval (A3).
17. **"Secrets in history" did not say whose history.** All local refs made the result depend on the machine's branches. Fixed: the history reachable from HEAD.
18. **No step audited a retained check's config.** A retained dependency-cruiser exclusion, `(^|/)dist/`, hid every package with a `dist/` entry, so the Dependency rule passed vacuously for package imports and was first recorded adopted on a proof that used a source-path violation. Fixed: the inventory reads each retained config's exclusions against the Rules for every Gate, and a Gate Proof's violation is of the class its Contract names (a package as well as a project module, for the Dependency rule).
19. **Overlapping tiers made proofs unattributable.** A fast Entry Point that also ran integration tests left the Unit tests proof with other Gates red, and a domain-rule violation also tripped the new unit-level rule. Fixed: the fast Entry Point runs no full Gate, and a proof's violation is one no other Gate's rule rejects.
20. **Not every context could be reached offline.** The factory's built release has non-bootable synthetic guest assets, and a Builder run needs real model sessions under per-run operator authorization, so E2E could only be blocked. Fixed: the inventory asks whether the deliverable as built can be driven offline and what each context needs there.
21. **The Mutation criterion was approved before its cost was known.** Stryker's runner for node:test has no per-test coverage, and the factory has 58,473 mutants, so the approved 2 h integral run cannot hold them. Fixed: the whole-codebase cost is measured before the cadence is approved, and the Adoption interview asks about the runner's capability.

## Run defects, not skill gaps

The skill already stated these rules; the run broke them and corrected itself, each by an approved amendment or a reviewed fix:

- the interview's "HEAD-only" secrets measurement silently used gitleaks' `--all` default, so the plan first approved 17 tolerated findings outside the tree;
- the first Avoided terms checker tokenized with a bare scanner, lost sync after template literals, and passed vacuously over its own Gate Proof's violation, which exposed it; it also made one avoided synonym look used in the code, which was dropped from the glossary and then restored;
- the Lint findings were first counted at 110; the project's leading-underscore convention for bindings kept on purpose, configured on the rule, left 61 to fix.

## Obligations changed by these fixes

Fixes 5, 7, 8, 11, 12, 13, 14, 17, 18, 19 and 21 change Gate Contract text, and fixes 1, 9, 15, 18 and 20 change what the adoption path's phases ask, A2's **Done when** included. Two of them found the TypeScript Stack Example short of the corrected Contracts, and the example is fixed in this change:

- fix 13: `examples/typescript/scripts/changes.mjs` applied the tip rule to any branch at the base tip; a new test pins the work of such a branch;
- fix 17: its Secrets Gate scanned every ref gitleaks could see; it now scans the history reachable from HEAD.

The example's full Entry Point was green on this change, its modes' rehearsal passed 5/5, and its Secrets Gate Proof, the one proof those changes affect, went red because of its Gate at `cfdc7b5`. It already met the rest: its fast mode runs only fast checks, its Guide pointers Gate lists its tools, and its Dependency rule proof imports a package. Per [AGENTS.md](../../../AGENTS.md), the skill is not ready again until acceptance runs of both paths follow this text.
