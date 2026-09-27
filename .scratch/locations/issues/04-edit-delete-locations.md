# 04: Edit & delete locations (permission model)

Status: resolved
Feature: locations

## Context

Grilling round (interactive questionnaire) decided the edit/delete permission model.

## Decisions

- Editable fields: **name + description only** — coordinates are never editable (moving a location is out of scope).
- Permission rule: **ADMIN** may edit/delete any location (unrestricted). **Owner (USER)** may edit/delete their own location only when no 3D model is attached and no image uploaded by another user exists; their own images do not block.
- UI: **inline editing in the sidebar** (Edit → inputs swap in, Save/Cancel), **confirm dialog** for delete, buttons **hidden** when not permitted (server 403 is the backstop).
- Schema: `Location.updatedAt` added (migration `20260927020000_location_updated_at`).

## Requirements

- [x] `PATCH /api/locations/:id` — zod (`updateLocationSchema`): name and/or description, `description: null` clears it, empty body → 400, coordinates rejected
- [x] Permission checks via `backend/src/lib/permissions.ts` (`canModifyLocation`), used by both PATCH and DELETE (DELETE tightened from "owner or admin" to the new rule)
- [x] Frontend: `LocationSidebar` edit mode (RHF + zod), delete confirm dialog, toasts, permission-mirrored button visibility, `updatedAt` shown in meta
- [x] 7 unit tests for the permission rule + 6 for the update schema (39 total)

## Comments

- 2026-09-27 (agent): Implemented. E2E verified: PATCH own 200 (+updatedAt), clear description 200, empty body 400, coords 400, seeded-as-user 403, seeded-as-admin 200, DELETE own 200. Model/foreign-image branches covered by unit tests (upload/models APIs don't exist yet).