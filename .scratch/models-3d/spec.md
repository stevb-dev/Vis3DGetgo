# models-3d — spec

Pre-seeded 3D models — GLB meshes or SPZ Gaussian splats — 1:1 with Location.
Admin-only upload + unregister API, seed pipeline, viewer in the detail pane.

## Endpoints

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| POST | `/api/models` | Admin | resolved — ticket 01 |
| DELETE | `/api/models/:id` | Admin | resolved — ticket 01 |

## Notes

- Models live in the bind-mounted `backend/models/` dir, served by nginx at `/models/*`.
- Budget: ≤50MB per file (`.spz` splats are far larger than GLB meshes).
- `Model.locationId` is unique — one model per location (re-seeding happens via
  the seed script, ticket 02; the API 409s on an existing model).
- `Model.format` (GLB | SPZ) drives the viewer's renderer (ticket 03).

## Tickets

- `01-model-registration-admin-api.md`
- `02-source-and-seed-models.md`
- `03-r3f-viewer-component.md`
