# Interview answers

The fixed answers this example was generated from. They are recorded here so the same tree can be regenerated, and so the decisions can be reviewed without replaying the conversation.

The questions follow [the skill's interview](../../skills/bootstrap-harness/INTERVIEW.md), in the order it asks them. The interview later added the scenario language and initial business scenarios (Q7-Q8); this example records them, as [#7](https://github.com/Sanmoo/skills/issues/7) applied the rule. Answers marked **confirmed** were accepted as-is by the user.

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

**Q7 - Scenario language**: Which language does the business reviewer read the business scenarios in?

English, the language the interview and [GLOSSARY.md](GLOSSARY.md) are written in, so the same reviewer validates both without a translation. The scenarios use the glossary's terms rather than introducing a competing model. **Confirmed.**

**Q8 - Initial business scenarios**: Which business journeys must the initial portfolio cover?

Two, whose meaning the user approved before any step definition was written:

1. **Loan and Return** - given a Book registered in the Catalog, when a Borrower takes it on Loan, the Loan can be consulted; when its Return is recorded, a later consultation shows the Loan has been returned.
2. **Book absent from the Catalog** - when a Borrower tries to take a Book on Loan that is not in the Catalog, the Loan request is refused because the Book was not found.

The executable wording is in [features/library_lending.feature](features/library_lending.feature); together the journeys reach Catalog and Lending. **Confirmed.**

## Stack

**Q1 - Language and runtime**: TypeScript 5.9.3 on Node 22.23.2. **Confirmed.**

**Q2 - Deliverable and outermost edge**: HTTP service; the e2e scenarios drive the built service as a separate process over HTTP on the port it reports. **Confirmed.**

**Q3 - Infrastructure per context**: one Postgres 17.2 per context run in an ephemeral container by the integration and e2e tests; Lending owns the `lending` schema, Catalog owns the `catalog` schema. One instance is enough at this size; see [ADR 0001](docs/adr/0001-schema-per-context.md). **Confirmed.**

**Q4 - One tool per Gate Contract**:

| Gate Contract              | Tool                                                      | Version                  |
| -------------------------- | --------------------------------------------------------- | ------------------------ |
| Format                     | Prettier                                                  | 3.9.10                   |
| Lint                       | ESLint with typescript-eslint                             | 10.13.0 / 8.72.0         |
| Types                      | TypeScript (`tsc --noEmit`, strict)                       | 5.9.3                    |
| Unit tests                 | Vitest                                                    | 4.1.12                   |
| Integration tests          | Vitest with Testcontainers (`@testcontainers/postgresql`) | 4.1.12 / 12.2.1          |
| E2E tests                  | @cucumber/cucumber, with TypeScript steps loaded by tsx   | 13.3.0 / 4.23.15         |
| Mutation                   | Stryker with its Vitest runner                            | 10.0.0                   |
| Context boundaries         | dependency-cruiser                                        | 18.7.0                   |
| Dependency rule            | dependency-cruiser                                        | 18.7.0                   |
| Static metrics             | ESLint `complexity`, dependency-cruiser, jscpd            | 10.13.0 / 18.7.0 / 5.4.2 |
| Dependency vulnerabilities | npm audit (npm bundled with Node 22.23.2)                 | 10.9.8                   |
| Secrets                    | gitleaks                                                  | 8.30.1                   |
| Avoided terms              | the repository's own script                               | n/a                      |
| Guide pointers             | the repository's own script                               | n/a                      |

**Confirmed.** Cucumber is the Gherkin executor; tsx only loads the TypeScript steps, so the scenarios run directly rather than through Vitest. No tool needs a network service except npm audit's advisory database; that Gate is full-tier, so the fast Entry Point stays offline.

**Q5 - Version pinning**: npm dependencies are exact in `package.json` and locked in `package-lock.json`; gitleaks and Node are pinned in `mise.toml`. **Confirmed.**

**Q6 - Entry Point mechanism**: `make`, with `make check-fast` and `make check` as the two Entry Points. **Confirmed.**

**Q7 - CI provider**: GitHub Actions. Its check workflow calls the full Entry Point for the repository and for this example; a scheduled workflow calls the full mutation run. The checkout must give each Gate what it measures: the history the Secrets Gate scans, and a base branch the Mutation Gate's changed-set comparison can resolve, so the example job in the check workflow fetches full history. **Confirmed.**

**Q8 - Threshold departures**: none. Mutation 80% overall and 90% in core, complexity 10, zero cycles, duplication 3%, vulnerabilities high and critical only - all at the defaults. **Confirmed.**

## Restored: the E2E level

[ADR 0003](docs/adr/0003-defer-the-e2e-level.md) deferred the level, and [ADR 0004](docs/adr/0004-defer-the-e2e-level-under-the-universal-rule.md) carried that deferral under the universal Gherkin rule that [Sanmoo/skills#6](https://github.com/Sanmoo/skills/issues/6) establishes. [Sanmoo/skills#7](https://github.com/Sanmoo/skills/issues/7) applied the rule and [ADR 0005](docs/adr/0005-restore-the-e2e-level-with-cucumber.md) supersedes ADR 0004:

- English Gherkin scenarios run directly by `@cucumber/cucumber`, with TypeScript steps loaded through `tsx`;
- the compiled service runs as a separate process against a real Postgres container, and scenarios reach it only over HTTP;
- the full Entry Point builds the deliverable before the E2E Gate runs;
- the two journeys in Q8 are the initial portfolio;
- `src/main.ts` reports its listening port, which is the readiness signal the level waits for.

## Gate Proofs

Every Gate - all fourteen Contracts - was proven after wiring, one at a time, by introducing the violation named in the Gate Contract. Results are recorded in [GATE-PROOFS.md](GATE-PROOFS.md).
