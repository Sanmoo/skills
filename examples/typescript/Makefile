SHELL := /bin/bash
.DEFAULT_GOAL := check

# The two Entry Points. Guides name these and nothing else.
.PHONY: check check-fast

# Fast Entry Point: the offline subset, suitable for a pre-commit hook.
check-fast: format lint types unit boundaries dependency-rule metrics secrets avoided-terms guide-pointers

# Full Entry Point: every Gate. CI calls this and the scheduled mutation job
# calls mutation-full.
check: check-fast integration mutation vulnerabilities

# TODO: the E2E Gate is deferred, so this tree has no e2e level and no e2e Gate
# Proof. Its tests will be rewritten in Cucumber/Gherkin after a product and
# architecture reanalysis; see docs/guides/testing-strategy.md.

# Gate targets, kept separate so a Gate Proof can run one Gate alone.
.PHONY: install build format lint types unit integration mutation mutation-full
.PHONY: boundaries dependency-rule metrics secrets avoided-terms guide-pointers vulnerabilities

install:
	npm ci

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
