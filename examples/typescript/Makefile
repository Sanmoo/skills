# Entry Points. The selection policy, the check list, and the budget live in
# harness/policy.json; scripts/run-mode.mjs applies them.
.PHONY: check check-fast

# Validation by change (the default) or integral validation (MODE=integral).
MODE ?= change

# Full Entry Point: CI calls it for a change; the approved cadence calls it
# with MODE=integral.
check:
	node scripts/run-mode.mjs $(MODE)

# Fast Entry Point: the offline fast Gates, for the pre-commit hook.
check-fast:
	node scripts/run-mode.mjs fast
