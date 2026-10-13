# 05: Search endpoint (cosine ranking + floor)

Status: ready-for-agent
Feature: search
Blocked by: 01, 02

## Context

`GET /api/locations/search?q=` returns semantically ranked locations. Public (consistent with `GET /locations`). Registered **before** `/:id` so `search` isn't parsed as an id.

## Requirements

- [ ] Validate with zod: `q` required, trimmed, min 2 chars → else 400. (Frontend debounces and won't call below 2.)
- [ ] Embed the query via `embedQuery(q)` (prefix `query: `).
- [ ] Query via `$queryRaw` using cosine distance `<=>`: `WHERE embedding IS NOT NULL AND 1 - (embedding <=> $vec::vector) >= $floor ORDER BY embedding <=> $vec::vector LIMIT $limit`.
- [ ] Top-K = 8, floor default `0.4` (named constant, easy to tune).
- [ ] Return `{ results: [{ id, name, description, latitude, longitude, thumbnail, similarity }] }` — `thumbnail` with the same enrichment as `GET /locations` (admin-pinned or first-by-order), `similarity` = `1 - distance` (0..1).
- [ ] Empty result set (nothing above floor) → `{ results: [] }`, not an error.

## Notes

- Serialize the query vector as `[0.1, 0.2, …]` and cast `::vector` (Prisma can't bind the vector type directly).
- Register the route above `/:id` (mirror the `nearby` route's ordering comment).
- Tune the floor against the seed landmarks + real queries before finalising; record the chosen value in a comment.

## Comments
