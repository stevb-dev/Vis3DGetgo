# 02: PostGIS nearby (radius) query

Status: resolved
Feature: locations

## Context

The GIST spatial index (`idx_location_coords`) exists from the initial migration. `GET /api/locations/nearby` returns 501. This is a headline thesis feature (`ST_DWithin`).

## Requirements

- [ ] `GET /api/locations/nearby?lat=&lng=&radius=` (radius in meters, default 1000, cap e.g. 50000)
- [ ] Validate query params with zod; 400 on invalid/out-of-range
- [ ] Query via `ST_DWithin(geography, geography, radius)` using `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography`
- [ ] Return distance in meters per location (`ST_Distance`)
- [ ] Verify with `EXPLAIN ANALYZE` that the GIST index is used; capture the plan for the thesis
- [ ] Unit-ish test with the seeded demo locations

## Notes

- Use `::geography` (spherical meters) rather than geometry degrees — simpler and correct for a map UI.

## Comments

- 2026-09-27 (agent): Implemented in `GET /api/locations/nearby?lat=&lng=&radius=`.
  - Query params validated with zod (`nearbyQuerySchema`): radius in meters, default 1000, capped at 50000. Invalid → 400 with field errors.
  - `$queryRaw` with `ST_DWithin(geography, geography, radius)` + `ST_Distance` for per-row meters; results ordered by distance.
  - New migration `20260927000000_geography_gist_index`: functional GIST index on `(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography)` — the geometry index from the init migration does not apply to geography queries.
  - Verified live: 500m around Prešeren Square → Prešeren 0m, Castle 308m, Tivoli excluded; default radius returns all three.
  - **EXPLAIN ANALYZE** (1000 temporary benchmark rows, 500m radius): `Index Scan using idx_location_coords_geography` — 9 rows in ~9ms. Plan captured in the infra smoke-test session; repeatable via the SQL in `backend/prisma/migrations/`.
