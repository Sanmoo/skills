# What the run exposed in the skill

This tree is the result of the greenfield acceptance run of `bootstrap-harness` that [#23](https://github.com/Sanmoo/skills/issues/23) asked for. Every gap below was fed back into the skill text in the same change. The run before this one, on 2026-10-21, kept its own record in this file at its starting commit; git history holds it.

## The acceptance run

- **When and where.** 2026-11-20, in a fresh session, on branch `agent-issue-23`.
- **Starting commit.** `ecfce57c566ab0a7dd5588feb019727da71ae538`. The session deleted `examples/typescript/` and regenerated it from an empty directory, following the greenfield path of [SKILL.md](../../skills/bootstrap-harness/SKILL.md) from phase 1 to phase 7.
- **Interview answers.** Fixed: they are [INTERVIEW-ANSWERS.md](INTERVIEW-ANSWERS.md) as it stood at the starting commit. The run departed from the file in two places:
  - it dropped the file's closing history section, because it described how the old tree had deferred and later restored the E2E level;
  - in [GLOSSARY.md](GLOSSARY.md), the answer to Q6, it replaced Book's avoided synonym `title` and Copy's `unit`. Both are identifiers the code and the stack already use, which the Avoided terms Contract warns against.
- **What the session read.** It did not consult the old example while generating. The skill points at the Stack Example as a reference, but an acceptance run that reads the tree it is regenerating cannot tell which rules live only in that tree. The old tree was read only afterwards, to diff against.
- **Outcome.** Every Gate Proof in [GATE-PROOFS.md](GATE-PROOFS.md) went red because of its own Gate. The other evidence, each run at a named commit:
  - the [rehearsal](scripts/rehearse-validation.mjs) of both modes passed all five scenarios at `a57e016`;
  - the [E2E executor verification](scripts/verify-e2e-executor.mjs) passed;
  - `make check MODE=integral` was green at `a57e016`, where the whole-codebase mutation scored 90.34% overall and 100% in core; `make check` was green there and again on the final tree.
- **Re-runs.** Fixes 5 to 12 below changed Gate Contract obligations. The example implemented them before the final runs, so the rehearsal, both Entry Points, and every Gate Proof ran against that behavior; fix 4 re-ran only the Mutation proof, as the issue allows. Fixes 11 and 12 came from review and added only tests of the Harness, which run in the full Entry Point; it was green on the final tree, and they change no Gate's analysis, so no Gate Proof re-ran for them. Fix 2 changes phase 5's **Done when**, which the adoption run in [#24](https://github.com/Sanmoo/skills/issues/24) must follow.

## Gaps and fixes

The run surfaced 1 to 4 while following the text. The diff against the old tree surfaced 5 to 10, and its review 11 and 12: rules the old example carried that the skill never stated, so a faithful regeneration dropped them.

1. **The rehearsal could be passed by a selector that always widens.** Phase 5 asked the rehearsal to show "a violation in an affected dependent is caught rather than listed". A selection that widens to everything also catches it. This run's selector did exactly that: its dependency graph config was invalid, so every change widened, and only an extra assertion exposed it. Fixed: phase 5 now requires the dependent to be caught by a selection that did not widen.
2. **Phase 5 could not be done before phase 6.** Phase 5 wires the Guide pointers Gate and is done when the full Entry Point is green. That Gate has no Guides to check until phase 6 writes them, so it can only pass vacuously or fail. Fixed: phase 5's **Done when** exempts the Guide pointers Gate, which phase 6's criterion already covers.
3. **The E2E Gate Proof's suggested violation was caught a level below.** "Break the route that reaches one context" turns the Integration tests Gate red first wherever an integration test drives the delivery routes, so the red result is not the E2E Gate's. Fixed: [GATE-CONTRACTS.md](../../skills/bootstrap-harness/GATE-CONTRACTS.md) now says to break the route where the deliverable is composed as it ships. This example drops a route from the composition in `src/main.ts`.
4. **The Mutation Gate Proof's suggested violation was too weak.** Deleting a core unit test's assertions left the core score at 90.32%, because the mutation run also executes the integration tests, and they kill the same mutants. Fixed: the Contract now says to delete the assertions of the core tests that cover the declared file at every level the mutation run executes. This example's proof then fell to 77.42%.
5. **A deletion could fail a Gate for no finding.** A deleted file handed to a file-scoped check (the formatter on a removed Guide, say) fails because the file is missing. Fixed: the Execution modes say a deleted file's dependents are affected, but no check is handed a file that no longer exists.
6. **The selection and the Mutation Gate could compare against different bases.** Nothing tied them together, and this run first gave them two variables and two config files. Fixed: the Contract says the selection and every changed-set Gate share one base. Here both read `MUTATION_BASE`, then the policy's `base`.
7. **Widening contradicted periodic execution.** "Widens to every applicable check over its whole input" turned a shared-config change into a whole-codebase mutation inside validation by change. That run is the check the Contract assigns to integral validation. Fixed: a Gate whose own Contract defines its change-mode scope keeps it under widening, and a periodic check stays periodic.
8. **Some impacts were not named.** Three were missing:
   - ignore files, which decide what changed-set discovery and the Gates see;
   - CI configuration;
   - changed paths outside the project the policy covers. This matters in a repository like this one, where the project is a subdirectory.

   Fixed: shared configuration now names the first two, and missing impact information names the third.

9. **Integral validation could lose its periodic result.** Stopping at the first failure, as validation by change does, means a failing Lint in the weekly run records the periodic mutation as never run. Its last failure then blocks nothing. Fixed: integral validation runs every check even after one fails.
10. **"Red because of that Gate" did not exclude a crash.** A Stryker crash, or an integration run without Docker, fails the Gate under proof, and the record would have called it proved. Fixed: a new Gate Proof rule counts a proof only when the Gate under proof ran, its analysis completed, and it analyzed the declared input.

11. **Nothing tested the proof tooling's own attribution.** The old tree tested which red results its proof runner counts; the regeneration had the rules but no test, so a runner that miscounted would have recorded a Gate as proved. Fixed: the Red-for-its-own-reason Gate Proof rule now requires those attribution rules to be tested. Here [test/harness/gate-proofs.test.mjs](test/harness/gate-proofs.test.mjs) runs in the full Entry Point.
12. **The periodic cadence could drift from CI.** The policy recorded the schedule as prose, with nothing tying it to the workflow that runs it. Fixed: the Contract now requires the recorded cadence to be checked against the schedule CI runs. Here the policy's `cron` is compared with `.github/workflows/integral.yml`.

## Regeneration defects, not skill gaps

The skill already stated these rules. The regeneration broke them, and this tree fixes them in the example with no change to the skill text:

- an import the dependency graph could not resolve was dropped instead of widening;
- changes outside the project directory were invisible to the selection, although the Secrets Gate scans the whole repository;
- a `MUTATION_SCOPE` left in the shell could narrow the whole-codebase run. It is now refused there, and announced whenever it is in effect.

Two failures were the proof runner working as designed, catching a proof that did not attribute:

- the first Secrets proof used a key outside the base32 alphabet that gitleaks' AWS rule requires, so nothing was found;
- the first Mutation proof left the test file misformatted, so Format went red first.

## Not reproduced, deliberately

- **ADRs 0002 to 0006 of the old tree.** They recorded that tree's history: E2E deferred, then restored, and the validation modes adopted. ADR 0002 also limited mutation to domain models. The fixed answers name no threshold or scope departure, and the Scope rule forbids excluding first-party production code, so this tree mutates all of `src/`. The composition root, which only the e2e level covers, counts as undetected.
- **The old `README.md` and the npm and make pins in `mise.toml`.** Neither is in the Guide inventory, and stack answer Q5 pins only Node and gitleaks. CI's npm is the one bundled with Node 22.23.2.

## Environment notes (not skill defects)

- Docker was available through the host socket, and the network reached the npm advisory database.
- The local Node install had npm upgraded to 12.0.2. npm 10.9.8, which CI uses, crashed generating the lockfile, as the stack interview's version-pinning step warns. The lockfile was generated with npm 12 and verified with `npm ci` under 10.9.8.
- The user's global mise config failed to build an unrelated tool, so this project's pins were installed by name.
- `make` reports every failing recipe as status 2, so an inconclusive result is read from `reports/validation.json`, not from the exit status. The Contract asks only for non-zero.
