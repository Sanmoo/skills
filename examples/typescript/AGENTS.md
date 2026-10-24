# Library Lending

An HTTP service that catalogues the books a library holds and lends them to borrowers, on Postgres.

`make check` is the full Entry Point and the one CI calls for a change; a change is done only when it is green. `make check-fast` is the offline subset for local hooks. A Gate Proof run is evidence requested by hand, not part of a change's CI.

The code is the source of truth: when a Guide and the code disagree, the code wins and the Guide gets fixed. The one exception is naming, where [GLOSSARY.md](GLOSSARY.md) wins and the code gets fixed.

- [GLOSSARY.md](GLOSSARY.md): read before naming any domain concept.
- [docs/guides/architecture.md](docs/guides/architecture.md): read before moving a concept between contexts or adding a context.
- [docs/guides/coding-standards.md](docs/guides/coding-standards.md): read before writing or reviewing code.
- [docs/guides/testing-strategy.md](docs/guides/testing-strategy.md): read before adding or moving a test.
- [docs/adr/](docs/adr/): read before changing a decision recorded there.
