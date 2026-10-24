# Gate Proofs

Every Gate was proven by introducing the violation named in its Gate Contract, running the Entry Point of its tier (`make check-fast` for fast Gates, `make check` for full Gates) with only the change under proof present, confirming it exited non-zero and named the Gate, then restoring the tree.

The Entry Point is the same command in every proof of a tier, and the tree is not: each run carries exactly one behavioral violation, which is why a red result can be laid at the Gate the Entry Point named. The proof script owns that reasoning and the checks it needs; what this page records is the outcome of one complete run.

A Gate Proof is defined in the [glossary](../../GLOSSARY.md); the report a run produces is execution evidence about the tree it ran against, and a previous report cannot establish that the current tree still works, so the report is not versioned. The [proof runner](scripts/gate-proofs.mjs) writes its report under `reports/`, which Git ignores, and a single-Gate iteration leaves the last complete report in place. To obtain current evidence, dispatch the [`gate-proofs` workflow](../../.github/workflows/gate-proofs.yml) from the Actions tab and download the report artifact from that run; the workflow file is the authority on how the baseline is validated and the report is published, and the run page ties the artifact to its tested commit.

The cost is one Entry Point run per Gate - the full tier's container, mutation run and advisory lookup included - and it is paid deliberately, which is why neither Entry Point runs a proof and why a single proof can be re-run alone. Each proof also records the changes its violation left in the tree, so the claim that only that violation was present is checkable rather than asserted.

A changed-set Gate needs its input to exist, and the branch a proof runs on may change none of it. So the Mutation proof declares the smallest eligible scope its violation needs - here the core domain file whose test the proof weakens - beside the proof definition in [the proof runner](scripts/gate-proofs.mjs). That declaration is setup, not a second violation: it is not a source marker, and the weakened test stays the only deliberate fault. For that one execution it replaces the Gate's changed-set selection through [the Mutation wrapper](scripts/check-mutation.mjs), and nothing else changes: the ordinary Entry Point of the tier runs, and the Gate's own analysis and the limits it applies from its configuration stay the ordinary ones. The proof runner accepts the red result only when the files the Gate analyzed are exactly the declared ones, so neither a partly covered input nor a wider analysis can be mistaken for the proof. An explicitly empty, missing, or ineligible declaration fails the run non-zero instead of widening to other files, falling back to the changed set, or passing with nothing analyzed, and the proof runner refuses a red Gate whose analysis did not cover the declared files. The declaration travels in the environment of that one execution, so it cannot reach a later proof or ordinary validation, and it is restored along with the violation.

Each proof's record keeps the requested scope and the files actually analyzed next to the Entry Point, the violation, the outcome, and the failing Gate. The scope is read from the Gate's own record of its analysis rather than from its logged output, so shortening that output cannot erase the basis for the proof, and a scope that could not be measured is stored as unavailable rather than as an empty set. Ordinary changed-set selection - including the legitimate empty set of a documentation-only branch, the unresolvable-base widening, and the scheduled whole-codebase run - keeps the behavior its Contract describes, and is checked separately in [the focused checks](test/harness/mutation-scope.test.mjs), which the Mutation Gate runs before it measures anything. Those checks drive the wrapper and the proof runner's evidence bookkeeping against controlled Git trees and a stand-in Entry Point; no proof runs during validation. An explicit-scope proof establishes enforcement and Entry Point wiring, not correctness of Git-based discovery, which is what those checks are for.

Before the E2E row was recorded, the level was also exercised by hand with five deliberate faults: a failing assertion, an undefined step, a pending step, no selected scenarios, and no compiled artifact. Each made the Gate exit non-zero. Cucumber's strict mode covers the assertion, undefined and pending cases; `scripts/run-e2e.mjs` covers the empty selection; the readiness wait covers the missing artifact.

| Gate                       | Tier | Tool (version)                                       | Violation introduced                              | Result |
| -------------------------- | ---- | ---------------------------------------------------- | ------------------------------------------------- | ------ |
| Format                     | fast | Prettier 3.9.10                                      | misindented a source file                         | red    |
| Lint                       | fast | ESLint 10.13.0 + typescript-eslint 8.72.0            | added an unused variable                          | red    |
| Types                      | fast | TypeScript 5.9.3                                     | assigned a string to a number                     | red    |
| Unit tests                 | fast | Vitest 4.1.12                                        | inverted the already-returned condition           | red    |
| Integration tests          | full | Vitest + Testcontainers 12.2.1 (Postgres 17.2)       | mapped `borrowed_at` from the wrong column        | red    |
| E2E tests                  | full | Cucumber 13.3.0 (built service over HTTP)            | renamed the route that registers a book           | red    |
| Mutation                   | full | Stryker 10.0.0 with its Vitest runner                | deleted the assertions of the core loan unit test | red    |
| Context boundaries         | fast | dependency-cruiser 18.7.0                            | imported a Catalog domain module from Lending     | red    |
| Dependency rule            | fast | dependency-cruiser 18.7.0                            | imported `pg` in the Catalog domain               | red    |
| Static metrics             | fast | ESLint `complexity`, dependency-cruiser, jscpd 5.4.2 | wrote a function with eleven branches             | red    |
| Dependency vulnerabilities | full | npm audit 10.9.8                                     | locked `tinypool@2.1.1` (critical advisory)       | red    |
| Secrets                    | fast | gitleaks 8.30.1                                      | added a well-formed fake cloud access key         | red    |
| Avoided terms              | fast | the repository's script                              | named an identifier `inventory`                   | red    |
| Guide pointers             | fast | the repository's script                              | linked a Guide to a missing file                  | red    |

The table records the complete run that established the Harness; the versions are the ones that run executed against. The full Entry Point was green on the final tree after every proof was reverted; CI's `example` job runs it on every pull request and does not run the proofs.

The table is history, not current evidence: a row says what a Gate did to the tree of that run, and no row speaks for a later change. The explicit-scope Mutation proof was re-run on its own after the change that introduced it, on a branch that changed no eligible Mutation input. That run printed:

```text
✔ Gate Proof: Mutation
  scope requested: src/lending/domain/loan.ts
  scope analyzed: src/lending/domain/loan.ts
```

and the Mutation Gate's own report for the same run scored the declared file 0 of 79 mutants detected, so the Entry Point went red on Mutation alone and for its score rather than for the setup. That transcript records what that run observed; it is not evidence about the current tree, which a fresh run of the proof runner has to establish. The other rows were not re-run, so nothing here claims they were.
