# 01: Model registration API (admin)

Status: resolved
Feature: models-3d

## Context

`POST /api/models` was a 501 stub guarded by `authenticate` + `requireAdmin`
(`backend/src/routes/models.ts`).

## Requirements

- [x] Admin-only: `POST /api/models` (multipart: `locationId` + a single `file`) and `DELETE /api/models/:id`
- [x] Accept `.glb` (GLB mesh) and `.spz` (3D Gaussian splat); reject anything else (400)
- [x] Size cap `MAX_MODEL_MB` (default 50) — `.spz` splats are far larger than GLB meshes
- [x] 404 if the location does not exist (or is soft-deleted); 409 if it already has a model
- [x] Server writes `<uuid>.<ext>` into the models volume (`path.join(MODELS_DIR, …)`) — a client filename can never path-traverse
- [x] Create the row with `filePath = "/models/" + filename`, `fileSize` from multer, and a new `format` enum (GLB | SPZ); return it (201)
- [x] `DELETE /api/models/:id`: hard delete + best-effort unlink of the file (404 if absent)

## Notes

- `MODELS_DIR` env points at `/app/models` in Docker (shared volume with nginx).
- Grilling round (2026-10-14) widened the original one-line spec: a single
  multipart endpoint replaces JSON registration (the seed script registers via
  Prisma directly, ticket 02), `.spz` Gaussian splats join `.glb`, the budget
  rises 5 MB → 50 MB, and a DELETE endpoint was added. The `Model.format` enum
  (migration `20261014020000_model_format`) lets the viewer pick a renderer
  without parsing the filePath extension.
- nginx `client_max_body_size` raised 10m → 60m to clear a 50 MB upload.

## Comments

- 2026-10-14 (agent): Implemented in `backend/src/routes/models.ts` + `lib/models.ts`.
  Verified: 4 new unit tests (`modelFormatFromFilename`) + backend `tsc` + live HTTP
  E2E (upload glb 201/GLB, re-upload 409, missing location 404, bad ext 400, upload
  spz 201/SPZ, non-admin 403, unauth 401, delete 200, re-delete 404, no orphan files
  after delete).
