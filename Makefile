.PHONY: check check-fast

# Fast Entry Point: offline Gates, suitable for a pre-commit hook.
check-fast:
	node scripts/check-pointers.mjs
	node scripts/check-avoided-terms.mjs

# Full Entry Point: every Gate. CI calls this and nothing else.
check: check-fast
	node scripts/check-skills.mjs
