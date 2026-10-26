SHELL := /bin/bash
.DEFAULT_GOAL := check

# The two Entry Points. Guides name these and nothing else; the full one has
# two modes of the same command.
.PHONY: check check-fast
MODE ?= change

# Fast Entry Point: the offline subset, suitable for a pre-commit hook.
check-fast: format lint types unit boundaries dependency-rule metrics secrets avoided-terms guide-pointers

# Full Entry Point: one command, two modes. Validation by change is what CI
# calls for a change; integral validation is what the periodic job calls.
# Which checks run, over which scope, under which budget and cadence is
# versioned policy in harness/policy.json, not a command catalogue here.
check:
	node scripts/run-mode.mjs $(MODE)

# Gate targets, kept separate so one Gate can be wired and run on its own. No
# Gate Proof uses them: a proof runs the Entry Point of the Gate's tier, which is
# what the proof exists to show.
.PHONY: install build format lint types unit integration e2e mutation mutation-full
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

mutation:
	npm run mutation

mutation-full:
	npm run mutation-full

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
