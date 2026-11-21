# Gate Proofs

The record of the Gate Proofs the 2026-11-20 [acceptance run](SKILL-FEEDBACK.md#the-acceptance-run) ran, one Gate at a time. Each proof is defined in [scripts/gate-proofs.mjs](scripts/gate-proofs.mjs), which applies the violation, runs the Entry Point of the Gate's tier, attributes the red result from the Entry Point's own report, and restores the tree. The run writes its raw report to `reports/gate-proofs.json`, which is not committed. A proof counts only when the failing check is the Gate under proof, the check actually ran and failed, and a declared scope was analyzed exactly as declared.

These outcomes belong to the tree they ran against. The Mutation proof ran at `2f6c0e7`, and every other proof ran at `a57e016`. The Secrets proof re-ran at `cfdc7b5`, after the adoption run ([#24](https://github.com/Sanmoo/skills/issues/24)) scoped its scan to the history reachable from HEAD. Between the two commits only the Mutation proof's own definition changed, and that file is outside both Entry Points. A later change needs its own run.

Tool versions are locked in [package-lock.json](package-lock.json) and [mise.toml](mise.toml). Every Gate is **adopted**: it runs under the day-zero defaults in both modes of the full Entry Point (and in the fast one when its tier is fast), it enforces its Contract, and its repeatable proof turned the Entry Point of its tier red because of it.

| Gate                       | Tier, Entry Point       | Tool and version                                       | Violation                                                                                                       | Outcome                 | Failing Gate               | State   |
| -------------------------- | ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------- | ------- |
| Format                     | fast, `make check-fast` | Prettier 3.9.10                                        | misindent one line of `src/catalog/domain/book.ts`                                                              | red because of the Gate | Format                     | adopted |
| Lint                       | fast, `make check-fast` | ESLint 10.13.0, typescript-eslint 8.72.0               | add an unused variable to `src/catalog/domain/book.ts`                                                          | red because of the Gate | Lint                       | adopted |
| Types                      | fast, `make check-fast` | TypeScript 5.9.3                                       | pass a number where `registerBook` takes the title string                                                       | red because of the Gate | Types                      | adopted |
| Unit tests                 | fast, `make check-fast` | Vitest 4.1.12                                          | invert the Overdue condition in `src/lending/domain/loan.ts`                                                    | red because of the Gate | Unit tests                 | adopted |
| Context boundaries         | fast, `make check-fast` | dependency-cruiser 18.7.0                              | import the Catalog's non-public `domain/book.ts` from Lending                                                   | red because of the Gate | Context boundaries         | adopted |
| Dependency rule            | fast, `make check-fast` | dependency-cruiser 18.7.0                              | import `pg` in `src/lending/domain/loan.ts`                                                                     | red because of the Gate | Dependency rule            | adopted |
| Static metrics             | fast, `make check-fast` | ESLint 10.13.0, dependency-cruiser 18.7.0, jscpd 5.4.2 | a function with eleven independent branches                                                                     | red because of the Gate | Static metrics             | adopted |
| Secrets                    | fast, `make check-fast` | gitleaks 8.30.1                                        | add `config/proof.env` holding a well-formed fake AWS access key                                                | red because of the Gate | Secrets                    | adopted |
| Avoided terms              | fast, `make check-fast` | `scripts/check-avoided-terms.mjs`                      | rename the Borrower's local name in `takeOnLoan` to `patron`                                                    | red because of the Gate | Avoided terms              | adopted |
| Guide pointers             | fast, `make check-fast` | `scripts/check-guide-pointers.mjs`                     | point the architecture link in `AGENTS.md` at a missing file                                                    | red because of the Gate | Guide pointers             | adopted |
| Integration tests          | full, `make check`      | Vitest 4.1.12, @testcontainers/postgresql 12.2.1       | map a Book's title from the id column in the Catalog adapter                                                    | red because of the Gate | Integration tests          | adopted |
| E2E tests                  | full, `make check`      | @cucumber/cucumber 13.3.0, tsx 4.23.15                 | drop the Loan creation route from the shipped composition in `src/main.ts`                                      | red because of the Gate | E2E tests                  | adopted |
| Mutation                   | full, `make check`      | Stryker 10.0.0 with its Vitest runner                  | delete the assertions of the core Lending tests that cover the Loan, unit and integration; score fell to 77.42% | red because of the Gate | Mutation                   | adopted |
| Dependency vulnerabilities | full, `make check`      | npm audit (npm bundled with Node 22.23.2)              | lock `lodash` 4.17.4, which has published critical advisories                                                   | red because of the Gate | Dependency vulnerabilities | adopted |

## Changed-set Gate: Mutation

Mutation is the only Gate that analyzes the files changed relative to a base, so its proof declares its input through `MUTATION_SCOPE`. For that execution only, the declaration replaces the changed-set selection.

- **Declared:** `src/lending/domain/loan.ts`
- **Analyzed:** `src/lending/domain/loan.ts`, as `reports/mutation/scope.json` records it.

Ordinary changed-set discovery is verified separately in [test/harness/changes.test.mjs](test/harness/changes.test.mjs), including its legitimate empty set. The refusal of an empty, missing, or ineligible declaration is verified in [test/harness/mutation-scope.test.mjs](test/harness/mutation-scope.test.mjs).

## Beside the proofs

- [scripts/verify-e2e-executor.mjs](scripts/verify-e2e-executor.mjs) shows that the E2E executor fails on each of these cases: a wrong assertion, no scenarios, an undefined step, a pending step, and an artifact that does not start.
- [scripts/rehearse-validation.mjs](scripts/rehearse-validation.mjs) rehearses the two modes on disposable copies. It shows four things:
  - a violation in an affected dependent is caught by a selection that did not widen;
  - a shared configuration change widens the selection;
  - a required validation beyond the budget is inconclusive and starts nothing;
  - integral validation runs the periodic mutation that validation by change only reports, and a periodic failure blocks only the changes in its scope.
