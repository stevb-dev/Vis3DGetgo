# 01: Production deploy runbook

Status: ready-for-agent
Feature: deployment

## Context

`docker-compose.prod.yml` exists (nginx builds the SPA, api runs compiled dist, entrypoint migrates + seeds). The runbook needs to be written and verified.

## Requirements

- [ ] `docs/deployment.md`: prerequisites, `.env` setup, placing models, build/start, migrate/seed behavior, verify (`/api/health`, login), port + TLS notes
- [ ] Document `COOKIE_SECURE=true` requirement behind HTTPS and how to terminate TLS (e.g. nginx + certs)
- [ ] Document common failures (port 80 busy, missing JWT_SECRET, DB not ready)
- [ ] Verify steps against `docker-compose.prod.yml` (see infra/02)

## Notes

- Backup/restore is separate: ticket 02.
