# 03: Embed on create + update (degrade to NULL)

Status: ready-for-agent
Feature: search
Blocked by: 01, 02

## Context

Every location must be searchable, and `name`/`description` are editable via `PATCH`. Embed synchronously on both writes. If embedding fails (model not warm, OOM), the row is still saved with a NULL embedding — the location stays on the map but is unsearchable until backfill (ticket 04).

## Requirements

- [ ] On `POST /api/locations`: after create, embed `passage: name. description` and store it via `$queryRaw` (`UPDATE "Location" SET embedding = $vec::vector WHERE id = $id`).
- [ ] On `PATCH /api/locations/:id`: when `name` or `description` changed, re-embed and update the same way.
- [ ] Serialize the vector as an array string (`[0.1, 0.2, …]`) and cast `::vector`.
- [ ] Wrap embedding in try/catch: on failure, log and leave the row with a NULL embedding (do **not** fail the request).
- [ ] Normalize the vector (unit length) before storage so `<=>` behaves as cosine.

## Notes

- The embed-on-write path and the search path (ticket 05) must share the same prefix convention and model instance — use the `embedPassage`/`embedQuery` helpers from ticket 02.
- Prisma can't write `Unsupported("vector")` fields through the normal client — raw SQL is required.

## Comments
