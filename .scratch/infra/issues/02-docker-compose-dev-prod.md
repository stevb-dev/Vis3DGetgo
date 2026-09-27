# 02: Docker Compose (dev + prod) — verify on a Docker host

Status: ready-for-human
Feature: infra

## Context

`docker-compose.yml` and `docker-compose.prod.yml` are written but not yet boot-verified on this machine (Docker 29 is available — an agent may attempt this, otherwise a human should).

## Requirements

- [ ] `docker compose up -d` boots db + api + frontend + nginx
- [ ] `curl http://localhost/api/health` → `{"status":"ok"}`
- [ ] `curl http://localhost/api/locations` → seeded demo locations
- [ ] Vite HMR works through the nginx dev config (open `http://localhost`)
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` boots the prod stack (SPA served by the nginx image)
- [ ] Register → login → refresh → logout works end-to-end against the running stack

## Notes

- Entrypoint auto-applies migrations; seed is manual in dev (`docker compose exec api npx tsx prisma/seed.ts`).

## Comments

- 2026-09-27 (agent): Dev stack booted and smoke-tested on this machine: db healthy, migrations applied, `/api/health` OK, `/api/locations` returns seeded data, full auth loop verified (register 201, duplicate 409, wrong password 401, login, cookie-based refresh rotation, logout, refresh-after-logout 401, malformed JSON 400, unauthenticated 401).
- Two fixes applied during verification: backend base image `node:20-alpine` → `node:20-slim` + `openssl` (Prisma engine), and anonymous `node_modules` volumes replaced with targeted source mounts (musl/Windows binary shadowing).
- Remaining: prod stack boot (`docker-compose.prod.yml`) and Vite HMR through nginx (polling enabled; needs a browser check).
- 2026-09-27 (agent): Prod images (`api` compiled dist, `nginx` with baked SPA) build successfully via `docker compose -f docker-compose.prod.yml build`. Actual prod boot untested (port 80 is used by the dev stack).
