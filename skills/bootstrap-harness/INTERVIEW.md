# Interviews

Both interviews run on the greenfield path. The adoption path runs _Adoption_ instead, after the inventory, with the same discipline: the agent discovers facts, the maintainer confirms them and makes every decision.

Interviews run in **rounds**. Map the open decisions as a tree: each decision unlocks the decisions that hang off it. The **frontier** is every decision whose prerequisites are settled. Ask the whole frontier in one round, number each question, and give your recommended answer. Then wait for the user's answers, recompute the frontier, and ask the next round.

Format each question as:

```
**Q<n> - <title>**: <question, with options when they exist>

Recommended: <answer and the reason for it>
```

Decisions belong to the user. Facts belong to you: look up anything the environment or current documentation can answer instead of asking. When the user supplies a briefing or product document, use it to sharpen your recommendations; the user still confirms every decision.

Record every confirmed answer in `INTERVIEW-ANSWERS.md` beside `GLOSSARY.md` on the greenfield path, numbered as the questions below are. On the adoption path, keep the answers in the adoption record outside the application until the plan is approved; the _Adoption_ section says when to merge them. The answer file is what makes the run repeatable, and it is where the reason for a surprising choice stays readable after the conversation is gone. The approved initial scenarios belong there too: they are the behavioral contract the e2e level implements.

An interview ends when its frontier is empty and the user confirms the summary you present.

## Domain

Settle these decisions, in dependency order:

1. **Purpose.** What the system does, for whom, and what makes it worth building rather than buying. The answer to the last part names the core.
2. **Subdomains.** Each area of the problem, classified as:
   - **core**: the differentiator, where the business wins or loses;
   - **supporting**: specific to this business but not a differentiator;
   - **generic**: a solved problem, best served by a library or a third party.
3. **Bounded contexts.** Each context owns one model and one language. At day zero, map contexts to subdomains roughly one to one and prefer fewer, coarser contexts: a boundary is cheap to split later and costly to merge. A generic subdomain served entirely by a third party needs no context of its own; its adapter lives in the context that uses it.
4. **Allowed dependencies.** Directed and acyclic: which context may call which, always through the callee's public interface.
5. **Shape.** The default is a modular monolith with one module per context. When the user wants another shape (one service per context, for example), record an ADR with the reason before moving on.
6. **Language.** For each context, the terms of its model, each with a one- or two-sentence definition and the synonyms to avoid.
7. **Scenario language.** Which language does the business reviewer read the business scenarios in? This fixes the language the scenarios are written and read in, keywords and prose alike; their terms remain the glossary's terms.

   Recommended: the language this interview was conducted in, because the people who already validate the glossary can validate the scenarios without a translation. Choosing a language does not authorize a competing domain model.

8. **Initial business scenarios.** Which business journeys must the initial portfolio cover?

   Recommended: one full journey per bounded context, combined into the fewest journeys that still reach every context. The agent drafts them from the confirmed requirements and `GLOSSARY.md`, and the business reviewer approves their meaning before any step definition is written.

While settling these, sharpen the language actively:

- When the user uses a vague or overloaded term, propose a precise canonical one ("by _account_, do you mean the Customer or the User?").
- When one word means different things in different places, that is evidence of two contexts.
- Invent concrete edge-case scenarios that force the boundaries between concepts into the open.

Write each term into `GLOSSARY.md` at the repository root the moment it resolves, one `##` section per bounded context, using this format:

```md
# <System name>

<One or two sentences on what the system is.>

## <Context name>

<One sentence on what the context owns.>

**<Term>**:
<One or two sentences defining what the term is.>
_Avoid_: <synonym>, <synonym>
```

Keep the glossary to definitions of domain terms. Implementation choices go to ADRs or to code.

## Stack

Read [GATE-CONTRACTS.md](GATE-CONTRACTS.md) before this interview: every recommendation you make here realizes a Gate Contract. The domain interview settled the business scenarios and their language; this interview chooses the executor that runs them, within that language.

Settle these decisions:

1. **Language and runtime**, with exact versions.
2. **Deliverable type and its outermost edge**, which is what the e2e tests drive:

   | Deliverable | Outermost edge |
   |---|---|
   | HTTP service | HTTP requests against the running service |
   | CLI | the built executable, run as a subprocess |
   | Library | the public API of the packed artifact, installed into a throwaway consumer |
   | Frontend | a real browser against the built application |
   | Worker | messages on the real broker, outcomes observed on its outputs |

3. **Infrastructure per context** (database, broker, cache). Integration tests run each one for real, typically in an ephemeral container.
4. **One tool per Gate Contract.** Research the currently maintained tools for the stack and recommend one per Gate, with its exact version. Verify that each tool can enforce the contract's criteria as stated, including the per-context thresholds for core contexts. The E2E row names the executor for the Gherkin scenarios: Cucumber is one option, not a requirement, and the executor must actually run Gherkin feature files in the language the domain interview confirmed. If it cannot run that language, raise it with the user instead of silently changing the language; verify that it can satisfy every E2E criterion, including failing on a wrong assertion and on each vacuous pass the Contract names. Check that the version you pick for the mutation tool supports the pinned unit and integration test runner; a vulnerability fix to the test runner can otherwise strand the Gate.
5. **Version pinning.** Language dependencies pinned by the ecosystem's lockfile. Standalone binaries (secret scanners, vulnerability scanners) pinned by a declarative version manager such as mise or asdf. Generate or verify the lockfile with the package manager version CI will use; a lockfile resolver can fail on peer dependencies that the installed package manager handles.
6. **Entry Point mechanism.** The task runner native to the ecosystem, or `make` when there is none. The full and fast Entry Points are two named commands of that mechanism.
7. **CI provider.** Any provider works, since its only job is to call the full Entry Point (plus the periodic full mutation run) on a checkout able to run every Gate as written; [SKILL.md](SKILL.md) phase 5 states what that checkout must provide.
8. **Threshold departures.** Present the defaults from GATE-CONTRACTS.md. When the user changes one, record why in an ADR only if the change is surprising and hard to reverse; otherwise the config value alone suffices.

## Adoption

Read [GATE-CONTRACTS.md](GATE-CONTRACTS.md) and complete the inventory in [SKILL.md](SKILL.md) phase A1 before this interview. Bring the inventory to the maintainer: every fact points at the evidence you inspected, and every inference is labelled for confirmation. The frontier is the set of decisions the inventory cannot make. Ask it in rounds; do not ask the maintainer for facts the environment already answers.

Settle these decisions, in dependency order:

1. **Deliverable and outermost edge.** Does the inventory's deliverable and outermost edge match the artefact the business and the e2e level must drive?

   Recommended: confirm what the repository actually delivers; the existing outermost edge is the e2e target. A different edge needs a stated reason and a place in the plan.

2. **Domain understanding.** Are these the bounded contexts, their kinds, and their language?

   Recommended: preserve the contexts, names, and terms the code and existing docs already use, and classify each as core, supporting, or generic from the evidence. Do not invent a model where the application already has one. Present a conflict between evidence sources as a decision for the maintainer.

3. **Boundaries.** Which boundaries and allowed dependencies are intended, and which observed edges are accidental?

   Recommended: treat the enforced context map and public interfaces as the starting declaration and preserve them. Stage an accidental edge for a separate, approved decision; do not refactor it automatically.

4. **Observed behavior and regression priorities.** Which workflows form the regression contract, and where does their evidence live?

   Recommended: start from the existing tests and the workflows the application already exercises. Preserve surprising but stable observed behavior; do not revalidate business correctness. Stage further characterization where evidence is thin. Exceptionally strong evidence of an obvious error is a localized decision, never an automatic correction and never a reason to stop unrelated adoption.

5. **Existing tools and checks.** Which existing tools and checks satisfy the agreed criteria and are retained, and which do you want replaced?

   Recommended: retain every tool and check that meets its Gate Contract; propose a replacement with its reason, compatibility cost, and migration work, and make it only after approval.

6. **Entry Points and CI.** Do the existing Entry Points and CI arrangement provide the fast and full tiers and call the full Entry Point?

   Recommended: retain working Entry Point names and adapt only what does not meet the Contract. CI calls the full Entry Point and nothing else, on a checkout that gives each Gate what it measures.

7. **Gaps and blocked work.** Which discovered gaps are staged now, which stay pending, and which are blocked?

   Recommended: order gaps by the protection they buy. A missing, unexecuted, or unproven check is pending. A check the environment cannot run is blocked, with what the maintainer must provide recorded beside it. No Gate is adopted because it is planned or configured.

8. **Stages, scope, budget, and cadence.** What are the stages, their priorities, the scope of each, and the project's validation budget and cadence?

   Recommended: protect the highest-value workflows first, take the cheap high-signal Gates early, and stage expensive checks rather than requiring every analysis before adoption begins. Agree a budget and cadence for this project; do not import a universal CI target.

9. **Plan approval.** Does the plan record every confirmed decision and every Gate's current state, and do you approve it?

   Recommended: approve the plan before any change. Drafting it touches nothing in the application, its tests, or its tooling, and no stage starts until the maintainer approves.

An adoption interview ends when the frontier is empty, every stage has its scope, budget, and cadence, and the maintainer approves the plan. Record every confirmed answer in the adoption record outside the application until that approval. After approval, merge them into `INTERVIEW-ANSWERS.md` under _Adoption_ and record the approved plan in `ADOPTION-PLAN.md` beside it, formatted so the fast Entry Point stays green.
