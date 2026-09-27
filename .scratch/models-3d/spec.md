# models-3d — spec

Pre-seeded GLB models, 1:1 with Location. Admin-only registration API, seed pipeline, R3F viewer in the detail pane.

## Endpoints

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| POST | `/api/models` | Admin | open — ticket 01 |

## Notes

- Models live in the `/models` volume, served by nginx at `/models/*`.
- Budget: ≤5MB per GLB after Draco compression.
- `Model.locationId` is unique — one model per location (upsert semantics for re-seeding).

## Tickets

- `01-model-registration-admin-api.md`
- `02-source-and-seed-models.md`
- `03-r3f-viewer-component.md`
