# 04: Backfill NULL embeddings (startup + interval)

Status: ready-for-agent
Feature: search
Blocked by: 01, 02

## Context

Existing/seed rows and any degrade-path failures have a NULL embedding. Backfill re-embeds them: once at startup (alongside migrate/seed in the entrypoint) and periodically in-process to catch stragglers, so a degraded location becomes searchable without a redeploy.

## Requirements

- [ ] Idempotent `backfillEmbeddings()` in the backend: select rows with `embedding IS NULL`, embed `passage: name. description`, update via `$queryRaw`.
- [ ] Run it once at startup (entrypoint, after `prisma migrate deploy`/seed, before the server listens — or on server boot).
- [ ] Also run it on an in-process interval (~10 min) for rows that became NULL while running.
- [ ] Guard against concurrency (don't stack overlapping backfill passes; skip a pass if one is already running).
- [ ] Log a count per pass so drift is visible.

## Notes

- Backfill must run in the API process (it needs the transformers.js model), not in a SQL migration.
- Keep it O(rows-with-NULL), not O(all rows) — the seeded set is tiny but user growth is unbounded.

## Comments
