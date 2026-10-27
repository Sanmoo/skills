# Guides

A Guide steers a change before it is made. Because the code is the source of truth, a Guide holds exactly three kinds of content:

1. **Intent**: why a rule or structure exists, and which alternatives were rejected.
2. **Judgment**: rules a reviewer applies that no Gate can verify, such as "prefer one deep module over several shallow ones".
3. **Pointers**: relative links to the code or config that holds the facts.

Everything else lives in code, and the Guide links to it. A Guide never lists the individual checks or their commands: the selection policy holds which checks exist, what makes each one apply, the scope it verifies, its cadence and its cost, and the Guide points at it.

| Content | Where it lives |
|---|---|
| Thresholds and limits | the config file of the Gate that enforces them |
| Tolerated findings | the Gate's tolerance policy, a versioned config file |
| The list of bounded contexts and their allowed dependencies | the module structure and the context boundaries Gate config |
| Formatting and lint rules | the formatter and linter config |
| Commands | the Entry Point definitions; Guides name only the two Entry Points and the full Entry Point's modes, never the individual checks |
| Which checks run, over which scope, at which cadence, under which budget | the versioned selection policy |
| Tool versions | the lockfile and the version manager file |

Write each line as the behavior you want ("name types after glossary terms"), and keep only lines that change what an agent would do by default.

## Two starting paths

A greenfield project creates the inventory below from scratch.

An existing application reconciles the documents it already has with the same inventory. Inventory the existing Guides, map each one to the inventory, and keep a Guide that already satisfies the three content rules. The adoption plan names, stage by stage, which missing Guides are created and which existing ones are amended, merged, or retired; none of that happens before the maintainer approves the plan. A stage executes only the Guide changes it names, and a Guide that already satisfies the inventory is left as it is. Do not create a parallel documentation set, and do not restate current thresholds, tool inventories, or commands merely to avoid touching an existing document later.

An adopted Harness ends with the same inventory as a greenfield one. The difference is the route: existing documents are the starting material, and changing one is a planned, approved change like any other.

An existing application also carries legacy debt. That debt is recorded as tolerated findings in each Gate's tolerance policy, never a parallel document; a stage records them there as part of its reviewed change, and a Guide points at that config instead of listing them.

`ADOPTION-PLAN.md` is a stage record, not a Guide, and is not part of this inventory. It is written after approval, before the first change, when the approved plan is recorded for execution, and holds the approved stages, their adoption criteria, and their decisions. Each stage adds its completion and Gate states to that record; once a stage is executed, the code and its config are the current truth, so the plan must not become a second source of thresholds, tool versions, or commands. The proofs and outcomes themselves live in the project's Gate Proof record, `GATE-PROOFS.md`, which the plan points at instead of copying. The plan names the tolerated findings at approval and records any approved amendment; it does not become the tolerance policy, and editing it outside that approval never adds, removes, or revalues one.

### Records and reports that are not Guides

`INTERVIEW-ANSWERS.md` records the confirmed interview answers so the run can be repeated. `GATE-PROOFS.md` is the Gate Proof record: each Gate's proof and outcome for a run. Neither is a Guide or a source of current policy; they are a decision record and run history. The raw report a run writes is uncommitted output; the Gate Proof record holds the row per Gate that ties the proof to its run. `ADOPTION-PLAN.md` is the stage record above. They live at the repository root beside the Guides but are not part of the inventory, and changing one never changes a rule the code enforces. The tolerance policy is not a record at all: it is Gate configuration and part of the code, so it lives in the Gate's config and changes only by a reviewed change.

The final report is a message to the maintainer, not a Guide. It states every Gate's state, the evidence or blocker, and whether the Harness is established; it does not become a durable document alongside the inventory. What must outlive the session is the executable Gate configuration and proof file, plus the Gate Proof record that ties each proof to its outcome; the report never restates current policy.

## Inventory

Create exactly these Guides in the target repository.

### `AGENTS.md`

The index every agent reads first, with `CLAUDE.md` as a symlink to it. Keep it short:

- one sentence on what the system is;
- the full and fast Entry Points, the full Entry Point's two modes and what a green result in each does and does not cover, and the rule that a change is done only when the full Entry Point is green in its change mode;
- the rule that the code is the source of truth: when a Guide and the code disagree, the code wins and the Guide gets fixed, except for naming, where `GLOSSARY.md` wins and the code gets fixed;
- a link to `GLOSSARY.md`, to each Guide, and to `docs/adr/`, each with one line on when to read it.

### `GLOSSARY.md`

Written during the domain interview, in the format given in [INTERVIEW.md](INTERVIEW.md).

### `docs/guides/architecture.md`

- Intent: why a modular monolith with one module per bounded context, and why boundaries are enforced rather than trusted.
- Judgment: how to decide whether a new concept belongs in an existing context or justifies a new one; when to open an ADR.
- Pointers: the context boundaries Gate config (the context map), the dependency rule Gate config, the core-context threshold config.

### `docs/guides/coding-standards.md`

- Judgment only: the rules lint cannot express (naming from the glossary, deep modules behind small interfaces, where a new piece of code belongs within a context).
- Pointers: the formatter, linter, and static metrics config.

### `docs/guides/testing-strategy.md`

- Intent: the definition of each test level (unit, integration, e2e), as in [GATE-CONTRACTS.md](GATE-CONTRACTS.md), stated for this project's stack and edge, including the scenario language the domain interview confirmed.
- Judgment: which level a new behavior is tested at; test doubles only for third-party systems at the boundary; which candidate behavior deserves a place in the e2e portfolio rather than another integration case; that a behavior already present is pinned by a regression test before it changes, and that such a test records observed behavior rather than auditing its correctness; and that the scenario approval the Contract requires precedes its step definitions.
- Pointers: where each level's tests live, the e2e feature files with their step definitions, the executor config, the mutation config with its thresholds.

### `docs/adr/`

One file per decision, numbered `0001-<slug>.md`, `0002-<slug>.md`, and so on. Each file holds a short title and one to three sentences of context, decision, and reason; add considered options only when the rejected alternatives are worth remembering. Write an ADR only when a decision is hard to reverse, surprising without context, and the result of a real trade-off. At bootstrap, the usual candidates are a shape other than a modular monolith, a missing type checker, and a threshold departure that meets all three criteria.

An accepted ADR stays as written. When a decision changes, write a new ADR and mark the old one `Superseded by ADR-NNNN`.
