# 01: Model registration API (admin)

Status: ready-for-agent
Feature: models-3d

## Context

`POST /api/models` returns 501 but is already guarded by `authenticate` + `requireAdmin` (`backend/src/routes/models.ts`).

## Requirements

- [ ] zod body: `{ locationId: number, filename: string }`
- [ ] Verify the file exists in the models volume (`path.join(MODELS_DIR, filename)`), `stat` for `fileSize`
- [ ] 404 if the location does not exist; 409 if it already has a model
- [ ] Create the row with `filePath = "/models/" + filename`; return it (201)
- [ ] Sanitize `filename` (no path traversal — reject `/`, `\`, `..`)

## Notes

- `MODELS_DIR` env points at `/app/models` in Docker (shared volume with nginx).
