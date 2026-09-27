# AGENTS.md

Instructions for AI agents working in this repository.

## User interaction preferences

- When the user says "Grill me" (or any grill trigger phrase), run the grilling flow but ask the questions through the **interactive question tool** (the ASK_USER_QUESTIONS tool with selectable options + recommended answers), not as plain markdown in the chat.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature>/` in this repo (local-markdown tracker). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles used as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
