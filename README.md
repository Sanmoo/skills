# skills

Personal agent skills by Samuel Santos, installable with the [skills CLI](https://github.com/vercel-labs/skills).

`bootstrap-harness` has two starting paths: it establishes a Harness from day zero in a greenfield repository, and adopts one in an existing application through a staged plan the maintainer approves.

List the available skills:

```sh
npx skills add Sanmoo/skills --list
```

Install one:

```sh
npx skills add Sanmoo/skills --skill <name>
```

## License

[MIT](LICENSE)

## Stack Examples

Non-normative realizations of the Gate Contracts for specific stacks live in [examples/](examples/). Start with the [TypeScript example](examples/typescript/AGENTS.md), which also records its [interview answers](examples/typescript/INTERVIEW-ANSWERS.md) and [Gate Proofs](examples/typescript/GATE-PROOFS.md). The adoption path's plan rehearsal against a disposable copy of that example is recorded in [docs/evidence/adoption-plan-rehearsal.md](docs/evidence/adoption-plan-rehearsal.md).
