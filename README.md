# Geospatial 3D Visualization Platform

On-premise, Dockerized web app (thesis project): Leaflet map → per-location Three.js 3D models + user-uploaded image carousels + user-created locations.

- Stack rationale: [`THESIS_TECH_STACK.md`](THESIS_TECH_STACK.md)
- Decisions: [`docs/adr/`](docs/adr/)
- Feature specs + tickets: [`.scratch/<feature>/`](.scratch/) (conventions: `docs/agents/issue-tracker.md`)
- Domain overview: [`CONTEXT.md`](CONTEXT.md)

## Quickstart (full Docker, dev)

```bash
cp .env.example .env        # optional — sensible dev defaults exist
docker compose up -d
```

| URL | What |
|-----|------|
| `http://localhost` | Nginx entry point (SPA via Vite proxy in dev) |
| `http://localhost:${FRONTEND_PORT:-5173}` | Vite dev server (HMR) |
| `http://localhost:3000` | Express API (`/api/health`) |

Migrations apply automatically on API start. Seed (admin user + demo locations):

```bash
docker compose exec api npx tsx prisma/seed.ts
```

## Host development (frontend outside Docker)

```bash
docker compose up -d db api nginx   # infra in Docker
cd frontend && npm install && npm run dev
```

Vite proxies `/api` → `localhost:3000`, `/uploads` and `/models` → `localhost:80`.

## Operations

- **Restart policy**: prod services run `restart: unless-stopped` (self-healing after crashes/reboots). Dev deliberately omits it so intentional stops stay down.
- **Healthchecks**: db (`pg_isready`) and api (`/api/health`) — prod nginx waits for a healthy API before starting.
- **Backups**: `bash scripts/backup.sh` (pg_dump + tar of uploads/models, keeps last 7), restore with `bash scripts/restore.sh backups/<stamp>`. Run from a Linux/macOS shell against the prod stack.

## Dev caveats (Windows host)

- **Backend edits**: tsx's file watcher can miss changes on Windows→Docker bind mounts. If the API doesn't hot-reload, run `docker compose restart api`.
- **Frontend edits**: Vite runs with polling (`VITE_USE_POLLING=true` in compose) so HMR is reliable inside the container.
- **Port `5173` blocked**: Windows/Docker Desktop may reserve `5173` for Hyper-V NAT, so `docker compose up` fails with `ports are not available: ... 0.0.0.0:5173: bind: An attempt was made to access a socket in a way forbidden by its access permissions`. Work around it by setting `FRONTEND_PORT` in `.env` to a free port (e.g. `4173`). Check which ports Windows has reserved with `netsh interface ipv4 show excludedportrange protocol=tcp`.

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Set `JWT_SECRET`, `POSTGRES_PASSWORD`, `SEED_ADMIN_*` in `.env`. The prod nginx image builds and serves the SPA itself. Set `COOKIE_SECURE=true` only when serving over HTTPS.

## Auth summary

15-minute JWT access token (SPA memory + sessionStorage) + 7-day rotating refresh token (httpOnly cookie, SHA-256 hashed in Postgres). Roles: `USER`, `ADMIN`. Reload restores the session silently via the cookie — no re-login. Rationale: [`docs/adr/0001-auth-jwt-over-keycloak.md`](docs/adr/0001-auth-jwt-over-keycloak.md).

## Demo accounts

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | ADMIN (seeded) |

## Implementation status

See [`docs/implementation-status.md`](docs/implementation-status.md) for the full build log. In short:

- **Done**: infra (compose dev/prod, nginx, healthchecks, backups), auth (backend + frontend + 26 unit tests), locations (CRUD + PostGIS nearby with geography GIST index), Leaflet map (sidebar detail, tooltips with thumbnails, create-location flow, locate button, geolocation start with Skopje fallback), Skopje seed data.
- **Open**: image uploads + carousel, 3D model registration + viewer, prod runbook — tracked under `.scratch/` (see [`.scratch/README.md`](.scratch/README.md)).

## Tests

```bash
cd backend && npm test     # 26 unit tests (vitest): tokens, bcrypt, schemas, CSRF
```

## Layout

```
backend/    Express + TypeScript + Prisma (+ PostGIS migrations, seed, entrypoint)
frontend/   Vite + React + TypeScript (Tailwind, shadcn/ui preconfigured)
nginx/      prod + dev server configs, multi-stage SPA build image
scripts/    backup/restore
docs/       ADRs, implementation status, agent docs
.scratch/   issue tracker (feature specs + tickets)
docker-compose.yml / docker-compose.prod.yml
.env.example
```
