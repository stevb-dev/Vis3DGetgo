# 03: Roles + admin access

Status: resolved
Feature: auth

## Summary

Implemented:

- `Role` enum (`USER`, `ADMIN`) on `User`, default `USER`.
- Role embedded in the access JWT payload; `authenticate` attaches `req.userRole`.
- `requireAdmin` middleware (403 for non-admins) — wired on `POST /api/models`.
- Seed script creates an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (idempotent upsert, promotes existing user to `ADMIN`).
- `GET /api/auth/me` returns the role so the SPA can render admin UI.

## Notes

- Role changes take effect on next access-token issue (≤15m). Acceptable for this scope.
