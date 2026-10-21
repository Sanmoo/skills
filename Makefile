.PHONY: check check-fast check-example

# Fast Entry Point: offline Gates, suitable for a pre-commit hook.
check-fast:
	node scripts/check-pointers.mjs
	node scripts/check-avoided-terms.mjs

# Full Entry Point: every Gate. CI calls this and nothing else.
check: check-fast
	node scripts/check-skills.mjs

# The Stack Example has its own Harness and Entry Points; CI runs it as a
# separate job.
check-example:
	$(MAKE) -C examples/typescript check
