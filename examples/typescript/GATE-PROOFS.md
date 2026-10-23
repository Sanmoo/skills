# Gate Proofs

Every implemented Gate was proven by introducing the violation named in its Gate Contract, running the Entry Point of its tier (`make check-fast` for fast Gates, `make check` for full Gates) with only that violation present, confirming it exited non-zero and named the Gate, then restoring the tree.

The Entry Point is the same command in every proof of a tier, and the tree is not: each run carries exactly one violation. That is what makes the result attributable, because the Entry Point stops at the first Gate that fails and every Gate names itself, so a correct proof leaves exactly one Gate red and it is the Gate under proof. Applying several violations to one tree would leave several Gates red, the first failure would hide the rest, and no run could say which Gate caught which violation. The script refuses a proof list in which a Gate label is used twice or a proof runs a single Gate target instead of an Entry Point. The machine-readable run is reproduced by the repository's Gate Proof script; this page records the result. The machine-readable results - each proof's command, exit code, red Gate names, and output excerpt - are committed at [reports/gate-proofs.json](reports/gate-proofs.json).

| Gate                       | Tier | Tool (version)                                       | Violation introduced                              | Result |
| -------------------------- | ---- | ---------------------------------------------------- | ------------------------------------------------- | ------ |
| Format                     | fast | Prettier 3.9.10                                      | misindented a source file                         | red    |
| Lint                       | fast | ESLint 10.13.0 + typescript-eslint 8.72.0            | added an unused variable                          | red    |
| Types                      | fast | TypeScript 5.9.3                                     | assigned a string to a number                     | red    |
| Unit tests                 | fast | Vitest 4.1.12                                        | inverted the already-returned condition           | red    |
| Integration tests          | full | Vitest + Testcontainers 12.2.1 (Postgres 17.2)       | mapped `borrowed_at` from the wrong column        | red    |
| Mutation                   | full | Stryker 10.0.0 with its Vitest runner                | deleted the assertions of the core loan unit test | red    |
| Context boundaries         | fast | dependency-cruiser 18.7.0                            | imported a Catalog domain module from Lending     | red    |
| Dependency rule            | fast | dependency-cruiser 18.7.0                            | imported `pg` in the Catalog domain               | red    |
| Static metrics             | fast | ESLint `complexity`, dependency-cruiser, jscpd 5.4.2 | wrote a function with eleven branches             | red    |
| Dependency vulnerabilities | full | npm audit 10.9.8                                     | locked `tinypool@2.1.1` (critical advisory)       | red    |
| Secrets                    | fast | gitleaks 8.30.1                                      | added a well-formed fake cloud access key         | red    |
| Avoided terms              | fast | the repository's script                              | named an identifier `inventory`                   | red    |
| Guide pointers             | fast | the repository's script                              | linked a Guide to a missing file                  | red    |

The full Entry Point was green on the final tree, after every proof was reverted.

## The Gate with no row: E2E tests

The **E2E tests** Gate Contract has no Gate in this tree, so it has no proof; the row is absent on purpose. [ADR 0003](docs/adr/0003-defer-the-e2e-level.md) records the deferral.
