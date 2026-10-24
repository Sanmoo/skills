SHELL := /bin/bash
.DEFAULT_GOAL := check

# The two Entry Points. Guides name these and nothing else.
.PHONY: check check-fast

# Fast Entry Point: the offline subset, suitable for a pre-commit hook.
check-fast: format lint types unit boundaries dependency-rule metrics secrets avoided-terms guide-pointers

# Full Entry Point: every Gate this tree has. CI calls this and the scheduled
# mutation job calls mutation-full.
check: check-fast integration e2e mutation vulnerabilities

# Gate targets, kept separate so one Gate can be wired and run on its own. No
# Gate Proof uses them: a proof runs the Entry Point of the Gate's tier, which is
# what the proof exists to show. The Mutation target first checks the wrapper's
# own scope selection against controlled Git trees, then mutates; the checks are
# what keeps a broken selection from passing as a smaller measurement.
.PHONY: install build format lint types unit integration e2e mutation mutation-full mutation-checks
.PHONY: boundaries dependency-rule metrics secrets avoided-terms guide-pointers vulnerabilities

install:
	npm ci

# The deliverable's artifact. The e2e Gate builds it before running the
# compiled service, so validation exercises what ships.
build:
	npm run build

format:
	npm run format

lint:
	npm run lint

types:
	npm run types

unit:
	npm run unit

integration:
	npm run integration

e2e: build
	npm run e2e

mutation: mutation-checks
	npm run mutation

mutation-full: mutation-checks
	npm run mutation-full

# The Gate Proof runner and the wrapper's scope selection are checked at the
# same executable boundary, against controlled Git trees, so a broken selection
# cannot pass as a smaller measurement.
mutation-checks:
	node scripts/run-gate.mjs "Mutation scope checks" -- node --test "test/harness/**/*.test.mjs"

boundaries:
	npm run boundaries

dependency-rule:
	npm run dependency-rule

metrics:
	npm run metrics

secrets:
	npm run secrets

avoided-terms:
	npm run avoided-terms

guide-pointers:
	npm run guide-pointers

vulnerabilities:
	npm run vulnerabilities
