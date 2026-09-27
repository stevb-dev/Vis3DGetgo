# locations — spec

Location CRUD + spatial queries. Data shape: 1 Location → 0..1 Model, 0..n Images. Public read; authenticated create with ownership; PostGIS radius search.

## Endpoints

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/locations` | No | implemented (list + model + image count + `thumbnail` = first image) |
| GET | `/api/locations/:id` | No | implemented (detail + model + ordered images) |
| POST | `/api/locations` | Yes | implemented (zod-validated, owner set from token) |
| PATCH | `/api/locations/:id` | Yes (see rule) | implemented (name/description only; coords not editable) |
| DELETE | `/api/locations/:id` | Yes (see rule) | implemented (cascades, best-effort file cleanup) |
| GET | `/api/locations/nearby?lat=&lng=&radius=` | No | implemented (ST_DWithin geography + GIST index) |

**Edit/delete rule** (ticket 04): ADMIN — any location. Owner — own location only, blocked when a model is attached or a foreign user's image exists.

## Notes

- Spatial GIST index exists in the initial migration (`ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`).
- Create flow: zod validation (name, description?, lat ∈ [-90, 90], lng ∈ [-180, 180]), `userId` from the access token.
- Spam mitigation (admin approval queue, per-user rate limit) is optional — see THESIS_TECH_STACK.md §14.

## Tickets

- `01-locations-api-crud.md`
- `02-postgis-nearby-query.md`
- `03-create-location-ui.md`
- `04-edit-delete-locations.md`
