# 01: Project skeleton

Status: resolved
Feature: infra

## Summary

Full repository skeleton scaffolded:

- `backend/` — bootable Express app (health endpoint), Prisma schema + committed initial migration (incl. PostGIS), auth routes implemented, feature routes stubbed with ticket pointers, seed script, entrypoint.
- `frontend/` — bootable Vite app, router + TanStack Query + Zustand auth store, API client with 401-refresh-retry, shadcn/ui preconfiguration, placeholder pages.
- `nginx/` — dev + prod configs, multi-stage SPA build image.
- Compose files, `.env.example`, `README.md`, `CONTEXT.md`, `docs/adr/0001-auth-jwt-over-keycloak.md`.

## Notes

- Feature endpoints return `501` with a pointer to their owning ticket (e.g. `.scratch/locations/issues/02-postgis-nearby-query.md`).
- Auth backend is implemented per `.scratch/auth/spec.md`; frontend auth UI remains open (`.scratch/auth/issues/05-frontend-auth-state-ui.md`).
