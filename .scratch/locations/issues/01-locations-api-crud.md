# 01: Locations API CRUD

Status: resolved
Feature: locations

## Context

`GET /api/locations` (list) and `GET /api/locations/:id` (detail) are implemented in `backend/src/routes/locations.ts`. `POST /api/locations` currently returns 501.

## Requirements

- [ ] `POST /api/locations`: zod schema `{ name: string(1..120), description?: string, latitude: number ∈ [-90, 90], longitude: number ∈ [-180, 180] }`
- [ ] Set `userId` from the authenticated request; return the created location (201)
- [ ] Duplicate-name policy: decide (allow, or 409 on identical name) and implement + document
- [ ] Optional: DELETE `/api/locations/:id` (owner or admin) — decide scope, likely later ticket
- [ ] Error shape consistent with existing endpoints (`{ error }`)

## Notes

- Route order matters: `/nearby` must stay registered before `/:id` (already the case).

## Comments

- 2026-09-27 (agent): Implemented in `backend/src/routes/locations.ts` (+ `backend/src/lib/schemas.ts`).
  - `POST /api/locations`: zod validation (`createLocationSchema`), trims name, sets `userId` from the token, returns 201. Verified: 201 with `userId`, lat=91 → 400 with field error.
  - Duplicate-name policy: **allowed** — locations are geographic entities and the same name in different places is legitimate (documented in code).
  - `DELETE /api/locations/:id`: owner or admin only (seeded locations have `userId = null` → admin-only). Best-effort unlink of model/image files from the volumes after the cascading DB delete. Verified: own → 200, re-delete → 404, seeded as non-owner → 403, seeded as admin → 200.
  - 13 schema validation unit tests in `backend/src/lib/schemas.test.ts`.
