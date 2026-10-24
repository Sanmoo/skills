# Engineering Harness

The vocabulary for establishing, on day zero of a greenfield project, the agent-oriented documents and deterministic checks that constrain every change to a codebase, independent of its technology stack.

## Language

**Harness**:
The complete set of Guides and Gates that constrains every change to a codebase, whether made by an agent or a human.
_Avoid_: Guardrails, scaffold

**Guide**:
An agent-oriented document in the Harness that steers a change before it is made, holding only what the code cannot express. The code, including the Gates, is always the source of truth; a Guide points to it rather than restating it.
_Avoid_: Guideline, instruction file

**Gate**:
A deterministic, executable check in the Harness that passes or fails a change after it is made.
_Avoid_: Quality gateway, sensor, guardrail

**Gate Contract**:
The stack-agnostic statement of a Gate's intent and acceptance criteria, which any stack must satisfy.
_Avoid_: Gate spec

**Gate Floor**:
The set of Gates every project must have from day zero, regardless of stack or subdomain.
_Avoid_: Minimum gates, baseline gates

**Gate Proof**:
The deliberate, temporary violation that shows a Gate turns the Entry Point red, required once for every Gate before the Harness counts as established.
_Avoid_: Smoke test

**Entry Point**:
A single command that runs Gates, in two tiers: the full Entry Point runs every Gate and is what CI calls for a change; the fast Entry Point runs the quick subset for local hooks. These are the only commands a Guide may name.
_Avoid_: Check script

**Walking Skeleton**:
The smallest end-to-end slice of real code that exists only so every Gate has something to run against from day zero.
_Avoid_: Boilerplate, hello world

**Stack Example**:
A concrete, non-normative realization of the Gate Contracts for one technology stack.
_Avoid_: Reference implementation, supported stack
