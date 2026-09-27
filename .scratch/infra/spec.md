# infra — spec

Dockerized on-premise infrastructure: dev + prod Compose topologies, Nginx reverse proxy/static server, PostGIS database, backend API image, frontend build chain, environment handling, health checks, backups.

## Topology

- **nginx**: entry point (port 80). Serves `/uploads` and `/models` from shared volumes, proxies `/api` → `api:3000` (prefix preserved), serves the built SPA (prod) or proxies the Vite dev server (dev).
- **api**: Node 20 + Express + TypeScript, Prisma, PostGIS client. tsx watch in dev, compiled `dist/` in prod. Entrypoint waits for DB → `prisma migrate deploy` → optional seed → start.
- **db**: `postgis/postgis:16-3.4-alpine`, healthcheck `pg_isready`.
- **frontend**: Vite dev server (dev only). In prod the SPA is baked into the nginx image (`nginx/Dockerfile`, multi-stage).

## Files

- `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod)
- `nginx/nginx.conf` (prod), `nginx/nginx.dev.conf` (dev), `nginx/Dockerfile`
- `backend/Dockerfile`, `backend/Dockerfile.dev`, `backend/scripts/entrypoint.sh`
- `frontend/Dockerfile.dev`
- `.env.example`

## Tickets

- `01-project-skeleton.md`
- `02-docker-compose-dev-prod.md`
- `03-healthchecks-and-backups.md`
