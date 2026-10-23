# Interview answers

The fixed answers this example was generated from. They are recorded here so the same tree can be regenerated, and so the decisions can be reviewed without replaying the conversation.

The questions follow [the skill's interview](../../skills/bootstrap-harness/INTERVIEW.md), in the order it asks them. Answers marked **confirmed** were accepted as-is by the user.

## Domain

**Q1 - Purpose**: What does the system do, for whom, and what makes it worth building rather than buying?

A small public library lends the books it holds. The differentiator is the lending policy - who may borrow, for how long, and when a loan becomes overdue - not the catalogue behind it. Build it rather than buy it because the policy is the library's own.
**Confirmed.**

**Q2 - Subdomains**: Which areas of the problem exist, and what kind is each?

- **Lending** - _core_: the loan, the due date, and the return are where the library wins or loses.
- **Catalog** - _supporting_: specific to this library, but a solved problem it does not compete on.

**Confirmed.**

**Q3 - Bounded contexts**: Which contexts own one model and one language?

Two, mapped one to one with the subdomains: **Lending** (Loan, Borrower, Due Date, Return, Overdue) and **Catalog** (Book, Copy). Fewer, coarser contexts are preferred; these are already the coarsest split that keeps the languages apart. No third-party subdomain needs a context of its own; Postgres is infrastructure, not a context.
**Confirmed.**

**Q4 - Allowed dependencies**: Which context may call which, through what?

- `lending -> catalog`, only through `catalog`'s public interface.
- `catalog ->` nothing.
- The HTTP delivery root imports both public interfaces; it is not a bounded context.

The graph is acyclic.
**Confirmed.**

**Q5 - Shape**: Modular monolith or another shape?

Modular monolith, one module per bounded context. No ADR needed; this is the default.
**Confirmed.**

**Q6 - Language**: Which terms does each context own?

Written to [GLOSSARY.md](GLOSSARY.md) as they resolved. Sharpening applied during the interview: "book" (the work) was separated from "copy" (one physical unit); "checkout" and "rental" were rejected in favour of "loan"; "user" and "patron" were rejected in favour of "borrower"; "inventory" was rejected in favour of "catalog".
**Confirmed.**

## Stack

**Q1 - Language and runtime**: TypeScript 5.9.3 on Node 22.23.2. **Confirmed.**

**Q2 - Deliverable and outermost edge**: HTTP service; a client reaches the built artifact over HTTP on the port it reports. The e2e level that would drive that artifact is deferred (see [Deferred: the E2E level](#deferred-the-e2e-level)). **Confirmed for the deliverable; the e2e level is reopened.**

**Q3 - Infrastructure per context**: one Postgres 17.2 per context run in an ephemeral container by the integration tests; Lending owns the `lending` schema, Catalog owns the `catalog` schema. One instance is enough at this size; see [ADR 0001](docs/adr/0001-schema-per-context.md). **Confirmed.**

**Q4 - One tool per Gate Contract**:

| Gate Contract              | Tool                                                      | Version                  |
| -------------------------- | --------------------------------------------------------- | ------------------------ |
| Format                     | Prettier                                                  | 3.9.10                   |
| Lint                       | ESLint with typescript-eslint                             | 10.13.0 / 8.72.0         |
| Types                      | TypeScript (`tsc --noEmit`, strict)                       | 5.9.3                    |
| Unit tests                 | Vitest                                                    | 4.1.12                   |
| Integration tests          | Vitest with Testcontainers (`@testcontainers/postgresql`) | 4.1.12 / 12.2.1          |
| E2E tests                  | not implemented; runner choice reopened                   | n/a                      |
| Mutation                   | Stryker with its Vitest runner                            | 10.0.0                   |
| Context boundaries         | dependency-cruiser                                        | 18.7.0                   |
| Dependency rule            | dependency-cruiser                                        | 18.7.0                   |
| Static metrics             | ESLint `complexity`, dependency-cruiser, jscpd            | 10.13.0 / 18.7.0 / 5.4.2 |
| Dependency vulnerabilities | npm audit (npm bundled with Node 22.23.2)                 | 10.9.8                   |
| Secrets                    | gitleaks                                                  | 8.30.1                   |
| Avoided terms              | the repository's own script                               | n/a                      |
| Guide pointers             | the repository's own script                               | n/a                      |

**Confirmed.** No tool needs a network service except npm audit's advisory database; that Gate is full-tier, so the fast Entry Point stays offline.

**Q5 - Version pinning**: npm dependencies are exact in `package.json` and locked in `package-lock.json`; gitleaks and Node are pinned in `mise.toml`. **Confirmed.**

**Q6 - Entry Point mechanism**: `make`, with `make check-fast` and `make check` as the two Entry Points. **Confirmed.**

**Q7 - CI provider**: GitHub Actions. Its check workflow calls the full Entry Point for the repository and for this example; a scheduled workflow calls the full mutation run. The checkout must give each Gate what it measures: the history the Secrets Gate scans, and a base branch the Mutation Gate's changed-set comparison can resolve, so the example job in the check workflow fetches full history. **Confirmed.**

**Q8 - Threshold departures**: none. Mutation 80% overall and 90% in core, complexity 10, zero cycles, duplication 3%, vulnerabilities high and critical only - all at the defaults. **Confirmed.**

## Deferred: the E2E level

A product decision taken during review of this change removed the e2e tests from this tree. They will be rewritten in Cucumber/Gherkin after a reanalysis of product and architecture, so writing them in the current runner first would leave work here that is known to be replaced. This is a departure from the answers above and from the Gate Floor, recorded rather than hidden:

- the example implements no E2E Gate, so the E2E Gate Contract has no Gate Proof here;
- the full Entry Point runs thirteen Gates, not fourteen;
- the stack answer for that level is reopened, not answered. Open in the reanalysis: whether the Gherkin runner is a separate one (`@cucumber/cucumber`) or layered over Vitest, and whether this is this example's choice only or a stack answer the interview itself should offer.

`src/main.ts` still reports its listening port, and the build target still produces the artifact, so the level has what it needs to come back.

## Gate Proofs

Every implemented Gate - thirteen of the fourteen Contracts - was proven after wiring, one at a time, by introducing the violation named in the Gate Contract. Results are recorded in [GATE-PROOFS.md](GATE-PROOFS.md), which also records why the E2E contract has no row.
