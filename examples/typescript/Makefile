SHELL := /bin/bash
.DEFAULT_GOAL := check

# The two Entry Points. Guides name these and nothing else.
.PHONY: check check-fast

# Fast Entry Point: the offline subset, suitable for a pre-commit hook.
check-fast: format lint types unit boundaries dependency-rule metrics secrets avoided-terms guide-pointers

# Full Entry Point: every Gate this tree has. CI calls this and the scheduled
# mutation job calls mutation-full.
check: check-fast integration mutation vulnerabilities

# Gate targets, kept separate so one Gate can be wired and run on its own. No
# Gate Proof uses them: a proof runs the Entry Point of the Gate's tier, which is
# what the proof exists to show.
.PHONY: install build format lint types unit integration mutation mutation-full
.PHONY: boundaries dependency-rule metrics secrets avoided-terms guide-pointers vulnerabilities

install:
	npm ci

# The deliverable's artifact. No Entry Point builds it: its only consumer was
# the deferred e2e level.
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

# TODO: the E2E Gate is deferred and its level will be rewritten in
# Cucumber/Gherkin (Sanmoo/skills#7), so nothing here runs an e2e Gate; see
# docs/adr/0004-defer-the-e2e-level-under-the-universal-rule.md.
