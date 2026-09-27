# 02: Backup/restore scripts

Status: ready-for-agent
Feature: deployment

## Context

Backup strategy documented in THESIS_TECH_STACK.md §12 but not scripted. Overlaps with `.scratch/infra/issues/03-healthchecks-and-backups.md` — implement once under root `scripts/` and cross-reference both.

## Requirements

- [ ] `scripts/backup.sh`: `docker compose exec db pg_dump` → timestamped SQL + `tar` of uploads/models
- [ ] `scripts/restore.sh <archive>`: restore DB + files, verify integrity
- [ ] Rotation: keep last N backups (parameterized)
- [ ] Document cron suggestion in `docs/deployment.md`

## Notes

- Use `-f docker-compose.prod.yml` when targeting the prod stack.
