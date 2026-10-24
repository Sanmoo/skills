# Gate Proofs

Every Gate was proven by introducing the violation named in its Gate Contract, running the Entry Point of its tier (`make check-fast` for fast Gates, `make check` for full Gates) with only that violation present, confirming it exited non-zero and named the Gate, then restoring the tree.

The Entry Point is the same command in every proof of a tier, and the tree is not: each run carries exactly one violation, which is why a red result can be laid at the Gate the Entry Point named. The proof script owns that reasoning and the checks it needs; what this page records is the outcome.

The cost is one Entry Point run per Gate - the full tier's container, mutation run and advisory lookup included - and it is paid deliberately, which is why the script sits in neither Entry Point and why a single proof can be re-run alone. Each proof also records the changes its violation left in the tree, so the claim that only that violation was present is checkable rather than asserted; the machine-readable run behind this page, with one entry per Gate, is committed at [reports/gate-proofs.json](reports/gate-proofs.json).

Mutation's changed-set scope adds one visible exception to the one-change rule: the proof also marks `src/lending/domain/loan.ts` as changed with a comment, because a branch that changes no domain code leaves the Gate nothing to mutate. The marker adds no behavior, and the Mutation entry records both paths.

Before the E2E row was recorded, the level was also run with five deliberate faults: a failing assertion, an undefined step, a pending step, no selected scenarios, and no compiled artifact. Each made the Gate exit non-zero. Cucumber's strict mode covers the assertion, undefined and pending cases; `scripts/run-e2e.mjs` covers the empty selection; the readiness wait covers the missing artifact.

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

The full Entry Point was green on the final tree, after every proof was reverted, and CI's `example` job runs it on every pull request.
