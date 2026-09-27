# 03: Health checks, restart policy, backup scripts

Status: resolved
Feature: infra

## Context

DB healthchecks exist in both compose files. API healthcheck, restart policy documentation, and backup/restore automation are pending.

## Requirements

- [ ] Add an `api` healthcheck to both compose files (Node one-liner hitting `http://localhost:3000/api/health` — no curl/wget in alpine)
- [ ] Document the `restart: unless-stopped` policy choice in the thesis/README
- [ ] `scripts/backup.sh`: `pg_dump` + `tar` of uploads/models into a timestamped archive
- [ ] `scripts/restore.sh`: restore DB and files from an archive
- [ ] Document backup rotation (keep last N archives)

## Notes

Overlaps with `.scratch/deployment/issues/02-backup-restore-scripts.md` — implemented once under root `scripts/`, cross-referenced here.

## Comments

- 2026-09-27 (agent): Implemented.
  - API healthcheck added to both compose files (Node one-liner hitting `/api/health` — no curl/wget in the image); prod nginx now waits for a healthy API (`condition: service_healthy`).
  - Restart policy documented in README "Operations": prod uses `restart: unless-stopped`, dev omits it intentionally.
  - `scripts/backup.sh`: pg_dump + tar of uploads/models into `./backups/<stamp>/`, keeps last `BACKUP_KEEP` (default 7). `scripts/restore.sh <dir> [stamp]`: restores DB + files. Run from a Linux shell against the prod stack.
  - Overlaps with deployment/02 — that ticket's remaining value is the runbook wording in `docs/deployment.md`.
