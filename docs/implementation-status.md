# Implementation Status

Session log of everything built so far — what is implemented, how it was verified, and what remains open. The thesis can cite this file directly as a build log.

> Last updated: 2026-09-27 · Stack running locally: `http://localhost` (SPA), `:3000` (API), `:5432` (PostGIS)

---

## 1. Infrastructure — `.scratch/infra/` (3/3 resolved)

- **Repo skeleton**: `backend/` (Express + TS + Prisma), `frontend/` (Vite + React + TS + Tailwind + shadcn preconfig), `nginx/`, compose files, `.env.example`, `README.md`, `CONTEXT.md`, ADRs.
- **Docker**: `docker-compose.yml` (dev: tsx watch + Vite polling) and `docker-compose.prod.yml` (nginx image builds & serves the SPA, API runs compiled `dist/`). `JWT_SECRET` is required in prod (`${JWT_SECRET:?...}` fails fast).
- **Entrypoint**: waits for DB → `prisma migrate deploy` → optional seed → start. Migrations auto-apply on boot.
- **Nginx**: `/uploads` + `/models` static from shared volumes; `/api/` proxied with the prefix preserved (backend mounts routes at `/api/*`); prod serves the built SPA, dev proxies Vite (HMR-aware).
- **Database**: PostGIS image, healthchecks (`pg_isready`), committed migrations incl. PostGIS extension, geometry GIST index, and geography GIST index.
- **Ops**: API healthchecks in both compose files (prod nginx waits for healthy API), `restart: unless-stopped` in prod only (documented choice), `scripts/backup.sh` / `restore.sh` (pg_dump + volume tar, keeps last 7).
- **Seed**: `backend/prisma/seed.ts` — idempotent admin upsert + demo locations; **owns the demo dataset** (prunes `userId IS NULL` rows not in the current list). Demo data: 4 Skopje landmarks (Macedonia Square, Kale Fortress, Stone Bridge, Matka Canyon).

**Verified**: compose config validates (both files), dev stack boots end-to-end, prod images build, seed runs idempotently.

## 2. Auth — `.scratch/auth/` (5/5 resolved)

### Backend (`backend/src/routes/auth.ts`, `lib/tokens.ts`, `middleware/`)
- `POST /api/auth/register` — zod, bcrypt cost 12 (salt embedded by bcrypt; app never touches salts), 409 on duplicate email/username, issues token pair.
- `POST /api/auth/login` — identical `401 Invalid credentials` for unknown email vs wrong password (no enumeration).
- `POST /api/auth/refresh` — validates hashed cookie token, **rotates** (revokes old, issues new), returns fresh access token. Presenting an already-revoked token is treated as theft → **entire token family revoked**.
- `POST /api/auth/logout` — revokes the presented token, clears the cookie.
- `GET /api/auth/me` — returns the public user (id, email, username, role, createdAt).
- **Token design**: 15m HS256 access JWT (`{ userId, role }`); opaque 32-byte refresh token, SHA-256 hash stored in `RefreshToken` table; `httpOnly + Secure + SameSite=Strict` cookie, path-scoped to `/api/auth`.
- **CSRF**: same-host Origin check (`csrfCheck.ts`) — Origin hostname must equal the Host header hostname (port-agnostic, works at any URL); missing Origin (non-browser) passes. Complements SameSite.
- **Roles**: `Role` enum, `requireAdmin` middleware, admin seeded from `SEED_ADMIN_*` env.

### Frontend (`stores/auth.ts`, `lib/api.ts`, `components/`, `pages/Login|Register`)
- Zustand store: access token + user in **memory, mirrored to sessionStorage** (tab-scoped; F5 restores instantly, no localStorage).
- `bootstrapAuth()` on boot: silent refresh via the httpOnly cookie (the source of truth); only a 401 clears auth (network/5xx hiccups keep the session).
- API client: Bearer attach, 401 → single refresh → retry (Content-Type preserved on retry), error type `ApiError`.
- **Refresh serialization**: in-flight promise dedupe (same tab) + cooperative localStorage lock (5s lease, no credentials) so two tabs can't present the same cookie simultaneously and trip family revocation.
- UI: Login/Register (react-hook-form + zod + shadcn), `GuestRoute` (authenticated users visiting `/login`/`/register` → `/`), `Header` (current user, ADMIN badge, logout, New location link), `ProtectedRoute` with `state.from` return navigation.

### Tests & verification
- **39 backend unit tests** (vitest — `npm test`): JWT tokens 9, validation schemas 19, CSRF same-host 4, location permission rule 7.
- Live E2E via HTTP: register 201 / duplicate 409 / wrong password 401 / login / refresh rotation / **reuse → 401 + both other sessions revoked** / logout / refresh-after-logout 401 / malformed JSON 400 / bogus Origin 403 / legit origins (localhost, :5173, no Origin) 200.
- Decision record: `docs/adr/0001-auth-jwt-over-keycloak.md`.

## 3. Locations — `.scratch/locations/` (4/4 resolved)

- `GET /api/locations` — list + model + image count + **`thumbnail`** (first image by carousel order; null when none) — powers the map tooltip.
- `GET /api/locations/:id` — detail + model + ordered images.
- `POST /api/locations` — zod-validated (name trim 1–120, description ≤500, lat/lng ranges), ownership from the JWT. Duplicate names **allowed** (documented: locations are geographic entities).
- `PATCH /api/locations/:id` — name/description only (coordinates deliberately not editable); `description: null` clears it.
- `DELETE /api/locations/:id` — cascades rows, best-effort unlink of model/image files.
- **Edit/delete permission** (`lib/permissions.ts`, grilling-round decision): ADMIN — any location. Owner — own location only, blocked when a 3D model is attached or an image uploaded by another user exists (own images don't block). `Location.updatedAt` tracks edits.
- `GET /api/locations/nearby?lat=&lng=&radius=` — `ST_DWithin(geography, geography, radius)` + `ST_Distance` meters, radius default 1000 / cap 50000, distance-ordered.
- **Index**: migration `20260927000000_geography_gist_index` — functional GIST on the geography cast (the geometry index from the init migration does not apply to geography queries).
- **EXPLAIN ANALYZE evidence** (1000 benchmark rows, 500m radius): `Index Scan using idx_location_coords_geography` — 9 rows in ~9ms.
- Frontend: create-location page (map click → pin → dialog form → 201 → navigate to the new location).

## 4. Map & UI — `.scratch/frontend-map/` (01, 04 resolved; 02, 03 partial)

- Leaflet + react-leaflet map, OSM tiles, markers from `GET /api/locations`, bundler-safe marker icons (`lib/leafletIcons.ts`).
- **Sidebar detail** (`components/LocationSidebar.tsx`): nested route `/locations/:id` under the map page — the map stays mounted; close via X, **Escape**, **empty-map click**, or clicking the selected marker again (toggle).
- **Selected marker** recolored via `.marker-selected` (hue-rotate + shadow).
- **Hover tooltip**: name + thumbnail (from the list endpoint's `thumbnail` field); name-only while a location has no images.
- **Locate button** (`components/LocateButton.tsx`, both maps): one-shot recenter (`getCurrentPosition`, 5s timeout), `flyTo` at `max(zoom, 15)`, temporary pulsing "you are here" dot (36px, 5s), spinner while locating, failures via **sonner** toasts. Button clicks/scroll don't leak to the map (`L.DomEvent.disable*Propagation`).
- **Map start**: browser geolocation when granted, else Skopje (`41.9973, 21.428`) — `hooks/useMapCenter.ts` + `Recenter` effect (react-leaflet ignores center changes after mount).
- Design decisions: `docs/adr/0002-map-interaction-design.md` (grilling round).

## 5. Bug ledger (root causes worth citing)

| Symptom | Root cause | Fix |
|---|---|---|
| API container crashed on boot | Prisma engine can't load openssl on Alpine | `node:20-slim` + `apt-get install openssl` |
| `libc.musl` binary errors after base-image change | Anonymous `node_modules` volume kept Alpine binaries shadowing the image | Targeted source mounts only (`src/`, `prisma/`, config files) |
| Reload at `http://localhost` logged the user out | CSRF allowlist only contained `localhost:5173` → refresh 403 → session cleared | Same-host Origin/Host hostname check |
| Create-location dialog invisible; clicks passed through to the map | Leaflet creates no stacking context (panes z ≤ 1000) vs dialog z-50 | Dialog overlay/content at z-[1000]/[1001] |
| POST after silent refresh would 400 | 401-retry rebuilt headers without `Content-Type` | Re-attach on retry |
| Two tabs refreshing simultaneously revoked the whole session | Same cookie presented twice = theft signal | Single-flight + cross-tab lock |

## 6. Remaining open work

- `images` (0/4): multer+sharp upload pipeline, carousel ordering, delete/ownership, upload UI + carousel.
- `models-3d` (0/3): admin registration API, sourcing demo GLBs (needs human), R3F viewer.
- `frontend-map` 02 (partial): 3D viewer + carousel sections in the sidebar; 03 (partial): viewport persistence across reloads.
- `deployment` (0/2): prod runbook (`docs/deployment.md`), backup rotation docs.
- Known residuals (documented in tickets): server-side grace period for just-rotated refresh tokens; tile caching for fully offline deployments.

## 7. Doc map

| Doc | Purpose |
|---|---|
| `THESIS_TECH_STACK.md` (v1.2) | Stack rationale, architecture, schema, flows — the thesis centerpiece |
| `docs/adr/0001-auth-jwt-over-keycloak.md` | Why hand-rolled JWT, not Keycloak |
| `docs/adr/0002-map-interaction-design.md` | Map UX decisions (sidebar, tooltips, locate) |
| `CONTEXT.md` | Domain vocabulary |
| `.scratch/README.md` | Tracker index (features → tickets → status) |
| `docs/implementation-status.md` | This file |
