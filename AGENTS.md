# Sanmoo/skills

Personal agent skills, installed with the skills CLI. Each skill lives in `skills/<name>/`.

- `make check` is the full Entry Point and the one CI calls for a change; a change is done when it is green. `make check-fast` runs the offline subset. A Gate Proof run is evidence requested by hand, not part of a change's CI.
- The code is the source of truth; see [ADR 0001](docs/adr/0001-code-is-the-source-of-truth.md). Name things after [GLOSSARY.md](GLOSSARY.md): terms under `_Avoid_` fail the check.
- Read [docs/adr/](docs/adr/) before changing the principles a skill rests on.
- Record follow-up work as GitHub Issues on `Sanmoo/skills`.

## Agent skills

### Issue tracker

Issues live as GitHub Issues on `Sanmoo/skills` (via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.
