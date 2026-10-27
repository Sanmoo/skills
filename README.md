# skills

Personal agent skills by Samuel Santos, installable with the [skills CLI](https://github.com/vercel-labs/skills).

`bootstrap-harness` has two starting paths: it establishes a Harness from day zero in a greenfield repository, and adopts one in an existing application through a staged plan the maintainer approves and the skill executes stage by stage, reporting the Harness established only when every Gate is adopted. An existing application keeps its legacy debt as specific tolerated findings in a versioned tolerance policy instead of a count, and new code is still held to the Contract's normal limits.

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

Non-normative realizations of the Gate Contracts for specific stacks live in [examples/](examples/). Start with the [TypeScript example](examples/typescript/AGENTS.md), which also records its [interview answers](examples/typescript/INTERVIEW-ANSWERS.md) and [Gate Proofs](examples/typescript/GATE-PROOFS.md).
