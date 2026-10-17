# Implementation Status

Session log of everything built so far — what is implemented, how it was verified, and what remains open. The thesis can cite this file directly as a build log.

> Last updated: 2026-10-18 · Stack running locally: `http://localhost` (SPA), `:3000` (API), `:5432` (PostGIS)

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

## 5. Images, thumbnails & reports — `.scratch/images/` (4/4 resolved)

Grilling-round design (2026-10-10): creation-order carousel (no reorder endpoint — it opened a thumbnail-hijack hole), admin-pinned thumbnails, creator picks the thumbnail on the initial batch, open uploads with report-to-admin moderation.

### Upload pipeline (`routes/images.ts`, `lib/images.ts`)
- `POST /api/locations/:id/images` — location check **before** multer (404), `upload.array('images', 10)` memory storage, filter JPEG/PNG/WebP, per-file `MAX_UPLOAD_MB` (5).
- **All-or-nothing batches**: any invalid file → 400 with a clear message (MulterError mapping: size/count/type).
- sharp: `rotate()` (EXIF orientation) → `resize(1200, 800, inside, no enlargement)` → WebP q85. EXIF metadata is stripped in the process (privacy).
- `order = max + 1` computed in an interactive transaction under a `FOR UPDATE` row lock on the Location — concurrent uploads can't tie.
- DB failure after write → fresh files unlinked (no orphans); `mkdir uploads` at boot.
- **Caps & limits**: `MAX_IMAGES_PER_LOCATION` (200, env-tunable) → 400; per-user upload rate limit (20/10 min, keyed by JWT userId — IP keying would throttle NAT users).
- **`thumbnailIndex`** (FormData): the location **creator** may designate one file of their **initial batch** as the pinned thumbnail (0 existing images, requester is owner or admin). Any later thumbnail change is admin-only.

### Thumbnail pinning (ticket 02 outcome)
- `Location.thumbnailImageId` nullable FK (SetNull on image delete) + `Location.seeded`.
- `PATCH /api/locations/:id/thumbnail` — **admin-only**, `{ imageId | null }`; image must belong to the location (400 otherwise); `null` restores the first-by-order fallback. The list endpoint prefers the pin (`thumbnail = pinned ?? first`).

### Delete (ticket 03)
- Owner or admin, else **403 with a reason** (documented: existence is already public via the location detail endpoint). Row delete + sibling `order` shift down in one transaction (orders stay contiguous 1..N), then best-effort file unlink. Deleting the pinned thumbnail resets to the fallback via SetNull.

### Reporting (grilling addition)
- `Report` table: category enum (SPAM, INAPPROPRIATE, WRONG_LOCATION, BROKEN, OTHER), target = image **or** location (CHECK exactly-one), reporter (named — visible to admins only), status OPEN/RESOLVED; per-reporter-per-target uniqueness via **partial unique indexes** (raw SQL in the migration); cascade with the target.
- `POST /api/images/:id/report` + `POST /api/locations/:id/report` (400 self-report, 409 duplicate), `GET /api/reports?status=` + `PATCH /api/reports/:id` (admin).

### Demo dataset ownership (grilling addition)
- The seed now creates a **demo curator account** (`SEED_DEMO_EMAIL/PASSWORD`, ADMIN role) that owns the 4 Skopje landmarks; `Location.seeded` drives the sidebar badge ("Pre-seeded demo location"). Pruning keys on `seeded` instead of `userId IS NULL`.

### Frontend (ticket 04)
- `ImageDropzone` (react-dropzone, guest log-in prompt, client pre-validation, star-per-file thumbnail picker for the creator's initial batch) + `ImageCarousel` (shadcn/embla — the WebP files are already the optimized size, no separate thumbnails).
- Per-slide: delete (own/admin, confirm dialog), report (flag → category dialog), admin pin/unpin. Location report button in the sidebar header. Invalidation of `['location', id]` + `['locations']` after every mutation.
- `ImageLightbox` — LMB on a carousel photo opens a full-screen Radix Dialog reusing the embla carousel (`startIndex` = clicked slide); caption `n / total · location`; click-to-toggle zoom (fit ↔ 2× fit) with drag-to-pan (edge-clamped) while zoomed; navigation resets the view; Escape closes the lightbox before the sidebar (state lifted).
- `AdminRoute` guard + minimal `/admin/reports` page (target, category, reporter, link to location, resolve) + header link for admins.

### Tests & verification
- **54 backend unit tests** (15 new): file filter, sharp transform (WebP magic, downscale box, no upscale), thumbnail-pick permission helper, report category + thumbnail schemas.
- **Live E2E (HTTP)**: uploads (multi, pinned pick, open uploads, 400 type/no-files/out-of-range index, 404 location, 401, 429 rate limit), pinning (admin 200/403-nonadmin/400-foreign/clear+fallback), delete (owner 200, non-owner 403, admin 200, 404, contiguous orders), reports (201/409/400-self/400-category/403-nonadmin-list/resolve/resolvedAt), seed (seeded flag + demo ownership).
- Frontend: `tsc` + vite build green; dev server boots clean. **Pending: interactive browser pass.**

## 6. Sidebar redesign — `.scratch/sidebar-redesign/` (4/4 resolved)

Grilling-round design (2026-10-11, extended 2026-10-13): reorder the sidebar, add a location category, a Save/bookmark feature with a `/saved` page, and a share-slug URL.

### Category (`issues/01`)
- `LocationCategory` enum (11 values — NATURE added 2026-10-13 so Matka Canyon is honestly labeled) + non-null `Location.category` with `MONUMENTS` backfill (migration `20261013000000_location_category_saved_location`).
- Create requires `category`; `PATCH /api/locations/:id` accepts it; list + detail return it. Seed: MONUMENTS for Square/Fortress/Stone Bridge, NATURE for Matka Canyon.
- Fixed a pre-existing schema drift: `Image.user` now declares `onDelete: Cascade` to match the committed init migration (no DB change).

### Sidebar reorder & meta (`issues/02`)
- `LocationSidebar.tsx` reordered: header (title + clamped description subtitle + actions) → meta (badge + category label) → images (carousel above dropzone) → 3D model (tall hero, hidden when `model` is null).
- Description is a 2-line clamp with a measured Show more/less toggle; coords/timestamps/image-count dropped from the meta block. New native `ui/select.tsx` for the category picker in the create + edit forms.

### Save/bookmark (`issues/03`)
- `SavedLocation` (unique user+location pair, cascade). `GET/POST /api/locations/:id/save` (read/toggle) + `GET /api/saved/locations` (list, thumbnail-enriched). Toggle returns the new `{ saved }`, handles the P2002 double-save race.
- Bookmark button in the header (filled when saved, guests → log-in); `pages/SavedPage.tsx` (protected) card list with Unsave + empty state; cards link with `?fly=1`.

### Share + slug (`issues/04`)
- `slugifyName` helper; Share button copies `/locations/<slug>/@<lat>,<lng>` (coords at 5-decimal precision) + toast.
- `GET /api/locations/resolve?lat=&lng=` → nearest within 25 m (`ST_DWithin`), 404 when none. `SlugResolver` route `/locations/:slug/@:coords` redirects to `/locations/:id?fly=1`.

### Fly-to
- `?fly=1` external-entry hint: `MapPage` flies the map to the selected location; merged into `Recenter` (`flyTo` wins over a slow geolocation resolve). In-place marker clicks don't re-center.

### Tests & verification
- **60 backend unit tests** (6 new): category required/unknown, category-only PATCH, resolve query schema.
- **Live E2E (HTTP)** — 16 checks, all green: category on list/detail, create 400-without/201-with, PATCH category, resolve nearest + 404, save read/toggle/list + 401.
- Frontend: `tsc` + vite build green. Pending: interactive browser pass.

## 7. Map filters — `.scratch/map-filters/` (4/4 resolved)

Category filter + zoom declutter, purely client-side (no backend, no migration, no dependency). Grilled 2026-10-13: category filter over marker clustering (dataset ceiling <20); "point of interest" = the *selected* category (not a static set); chips + `?category=` URL param (ADR-0002); below zoom 12 with no filter the map is empty (a subtle empty-state hint shows).

- **CategoryFilter** (`components/CategoryFilter.tsx`): single-row, horizontally-scrollable chip row overlaid top-center (`z-[1000]`, `.no-scrollbar` in `index.css`), single active category, synced to `?category=` via `useSearchParams` (functional updater, `replace`). Per-category lucide icon (`lib/categoryIcons.tsx`) + left/right scroll arrows that hide at each end. `isLocationCategory` type guard in `lib/types.ts`.
- **Sidebar meta**: the category badge now carries its icon too (`CategoryIcon` in `LocationSidebar.tsx`), keeping the icon consistent with the chips.
- **Empty state**: when no markers are visible (below the gate with no filter, or an empty category) a non-interactive hint ("No locations here — pick a category or zoom in") renders pinned to the bottom of the map, so pan/zoom still work.
- **Visibility predicate** (`MapPage.tsx` `visibleLocations`): selected pin always renders → active category filters at all zooms → else the zoom gate (`ZOOM_GATE = 12`, hidden below).
- **Live zoom** (`ZoomTracker`): reads `zoomend` — the `MapContainer` `zoom` prop only applies on mount.
- **Navigation** (`navigateMap`): preserves `?category=` across marker-click/sidebar navigation; the transient `fly` hint is dropped (not carried) so in-place clicks don't re-center.
- External entry is safe: `?fly=1` flies to zoom 15 (> 12) and the selected pin is exempt.

**Verified**: `tsc` + vite build green. Pending: interactive browser pass.

## 8. Tile layers — `.scratch/tile-layers/` (5/5 resolved)

Switchable key-free base layers on the main map: OpenFreeMap (vector, Liberty/Bright/Dark via MapLibre GL) + OpenTopoMap (raster). Grilled 2026-10-12 + 2026-10-13 (the latter moved the layer into the URL and switched the control to click-to-open).

- **Deps** (`main.tsx`): `maplibre-gl` + `@maplibre/maplibre-gl-leaflet`; `setWorkerUrl(maplibre-gl-worker.mjs?worker&url)`; `maplibre-gl.css`.
- **Config** (`lib/tileLayers.ts`): `TileLayerId`/`TileLayerDef`, `TILE_LAYERS`, `DEFAULT_LAYER_ID`, `getLayer`, `isTileLayerId` — pure, testable.
- **Controller** (`components/TileLayerController.tsx`): swaps the base layer imperatively on `layer.id` — vector via `maplibreGL({ style, attributionControl: { customAttribution } })`, raster via `L.tileLayer`.
- **Switcher** (`components/TileLayerSwitcher.tsx`): bottom-left square (active thumbnail); click opens a menu to the right; outside-click/Escape closes.
- **State**: `?layer=<id>` URL param (default `liberty`), preserved by `navigateMap` alongside `?category=`.
- **Thumbnails** (`public/layers/`): `topo.png` is a real OpenTopoMap tile; the three OpenFreeMap ones are gradient placeholders (soft spot, not faithful captures).

**Verified**: `tsc` + vite build green (worker chunk emitted). Pending: interactive browser pass. Bundle grew to ~1.75 MB (maplibre-gl) — accepted cost of vector tiles.

## 9. Search — `.scratch/search/` (6/6 resolved)

Semantic location search: local multilingual embeddings (e5-small) + pgvector, no external API. Grilled 2026-10-10 + 2026-10-13 (the latter moved the box above the chips and made search clear the category filter).

- **DB**: `db/Dockerfile` compiles pgvector v0.7.4 into postgis:16-3.4-alpine; `embedding vector(384)` column (migration `20261014000000_location_embedding`).
- **Embedding** (`lib/embedding.ts`): `@huggingface/transformers` 4.3.1, `Xenova/multilingual-e5-small` (q8 quantized, baked into the image), lazy singleton, `embedPassage`/`embedQuery` (e5 `query:`/`passage:` prefixes), warmed at startup.
- **Embed on write** (`lib/search.ts` `embedLocationAndStore`): POST/PATCH embed synchronously, degrade to NULL on failure; vector serialized `[a,b,c]::vector` via raw SQL.
- **Backfill** (`backfillEmbeddings`): startup + 10-min interval, idempotent, concurrency-guarded.
- **Endpoint**: `GET /api/locations/search?q=` — cosine `<=>` + floor 0.4 + LIMIT 8, thumbnail-enriched. E2E: "castle" → Skopje Fortress (0.82).
- **UI** (`SearchBox.tsx`): top-center above the category chips; 300ms debounce; select → fly + clear `?category=`.

**Verified**: 60 unit tests + typecheck green; live HTTP E2E (semantic matches incl. Macedonian). The backend image now carries the ~120MB quantized model + onnxruntime native deps. Pending: browser pass on the search UI.

## 10. Report resolution — `.scratch/report-resolution/` (8/8 resolved)

Two-action admin moderation (**Delete content** / **Dismiss**) replacing the single Resolve button, with soft-delete, owner notifications, an admin unread badge, and a "My reports" view. Grilled 2026-10-14 (decisions: child-image OPEN reports auto-close on a location delete but their owners are *not* notified; badge counts live in dedicated endpoints; `seen` fires only on the Open tab).

### Schema (migration `20261014010000_report_resolution`)
- `ReportStatus` + `DISMISSED` (RESOLVED = content deleted, DISMISSED = no action); `Report.resolvedAt` → `closedAt` (rename, data preserved); `Report.note`.
- Soft-delete: `Image.deletedAt`, `Location.deletedAt` (a location delete cascades `deletedAt` to child images; files stay on disk).
- `User.lastSeenReportsAt` (admin unread watermark) + `Notification` (snapshot: `type`/`contentName`/`category`/`note`/`readAt`, no FK to content) + `NotificationType`.

### Resolve endpoint (`routes/reports.ts`, `lib/schemas.ts`)
- `PATCH /api/reports/:id` takes `{ action: DELETE|DISMISS, note? }` (`resolveReportSchema`).
- **DISMISS** → `DISMISSED` + `closedAt` + note, no content change.
- **DELETE** → soft-delete the target (image, or location + cascade to child images), clear the pinned thumbnail when it's the removed image, `RESOLVED` + note, auto-close same-target **and** child-image OPEN reports (no note), notify the acted-on target's owner (`MODERATION_REMOVAL`, snapshot of name + category + note; skipped when `userId` is null). All in one transaction.
- `GET /api/reports?status=OPEN|CLOSED` (CLOSED = RESOLVED+DISMISSED, default OPEN). The moderation include deliberately does NOT filter soft-deleted targets.

### Hidden content (`deletedAt` filtering, ticket 04)
- Every read filters `deletedAt: null`: locations list/detail, `nearby`/`resolve`/`search` raw SQL, saved list, image upload/delete; the write paths (report/save/thumbnail/edit/delete) 404 on soft-deleted targets; the search backfill skips deleted rows.
- Thumbnail resolution stays correct via the **pin-cleared-on-soft-delete** invariant (the `thumbnailImage` relation never points at deleted content).

### Admin UI + badge (`pages/AdminReportsPage.tsx`, `components/Header.tsx`)
- Per-report dropdown (Delete content / Dismiss) + confirm dialog + optional note; Open/Closed tabs via `?status=`; closed rows labeled Resolved/Dismissed with `closedAt`; "Open location" hidden for soft-deleted targets.
- `GET /api/reports/unread-count` + `POST /api/reports/seen` (admin); badge on the Reports link (hidden at 0); `seen` fires only when the Open tab is active.

### Reporter + owner views
- `GET /api/my-reports` + `/my-reports` page (ProtectedRoute) + header link for all logged-in users; status + dismiss note rendered.
- `GET /api/notifications` + `POST /api/notifications/read-all` + `GET /api/notifications/unread-count` (`routes/notifications.ts`); `NotificationBell.tsx` dropdown in the header with an unread badge; opening marks all read.

### Tests & verification
- **64 backend unit tests** (5 new: `resolveReportSchema`); backend `tsc` green.
- **Live E2E (HTTP)** — 21 checks green: DELETE (soft-delete 404, list absence, sibling + child-image auto-close, owner notification, unread + read-all) and DISMISS (stays live, note shown to reporter), invalid action 400, report-on-deleted 404.
- Frontend: `tsc` + vite build green. **Pending: interactive browser pass.**

## 11. 3D models — `.scratch/models-3d/` (3/3)

Admin model upload + unregister (ticket 01). Grilling round (2026-10-14) widened
the original one-line spec: a single multipart endpoint, `.glb` + `.spz` (3D
Gaussian splats), 5 MB → 50 MB budget, and a DELETE endpoint.

- **Schema**: `ModelFormat` enum (GLB | SPZ) + `Model.format` — migration
  `20261014020000_model_format`. The viewer branches on `format` instead of
  parsing the filePath extension.
- **`POST /api/models`** (admin, multipart): `locationId` + a single `file`;
  404 missing/soft-deleted location, 409 existing model, 400 bad extension or
  >`MAX_MODEL_MB` (default 50). Server writes `<uuid>.<ext>` into the models
  volume (no path traversal), returns 201 `{ model }`; a DB failure unlinks the
  fresh file.
- **`DELETE /api/models/:id`** (admin): hard delete + best-effort unlink, 404.
- **Config/infra**: `MAX_MODEL_MB` (default 50); nginx `client_max_body_size`
  10m → 60m (both confs).

**Verified**: 4 new unit tests (`modelFormatFromFilename`), backend `tsc` green,
live HTTP E2E — upload glb 201 (format GLB) / spz 201 (format SPZ) / re-upload
409 / missing location 404 / bad ext 400 / non-admin 403 / unauth 401 / delete
200 / re-delete 404 / no orphan files after delete.

### Viewer (ticket 03)

Modal 3D viewer, grilling round (2026-10-14): modal-only (the sidebar shows a
"View 3D model" button with a GLB/SPZ label), a single `ModelViewer` branching
on `format`, orbit-only controls.

- **GLB** → R3F `<Canvas>` + `GLTFLoader` (via `useLoader`) + `<Center>` scale-to-fit.
- **SPZ** → `@mkkellogg/gaussian-splats-3d` `Viewer` (peer three ≥0.160, matches
  0.160.1); disposed on unmount. New dep added to `frontend/package.json`.
- **Lazy**: `React.lazy` + `<Suspense>` — the viewer (three/drei + splat lib)
  ships as its own 1.14 MB chunk, off the critical path.
- **Escape/close**: closes the modal without also closing the sidebar (same
  `stopPropagation` fix as the lightbox bug).
- **Loading progress** (2026-10-14): a determinate bar + percentage replaces the
  old indeterminate spinner (grilling round). SPZ drives it from
  `addSplatScene`'s `onProgress` (Downloading → real %, Processing → indeterminate
  sweep + "Processing…", since decompression isn't progress-reported); GLB drives
  it from `GLTFLoader` byte progress via `useLoader`. The lazy-chunk `<Suspense>`
  spinner is unchanged (dynamic import exposes no progress).
- **Sidebar model controls** (2026-10-15): admin-only upload + delete in the
  sidebar's "3D model" section (`components/ModelControls.tsx`). Upload = single
  `.glb`/`.spz` file picker → `POST /api/models`; delete = confirm → `DELETE
  /api/models/:id`. The section renders for admins even with no model (to surface
  the upload); non-admins still see it only when a model exists.
- `Model.format` added to the frontend `Model` type; `types/gaussian-splats-3d.d.ts`
  declares the untyped lib.

**Verified**: `tsc` + `vite build` green (viewer code-split into a lazy chunk),
dev server transforms the modules and resolves the splat dep (HTTP 200).
Pending: interactive browser pass (needs real `.glb`/`.spz` — ticket 02).

### Demo models (ticket 02)

Seeded 3 demo models (`.scratch/models-3d/issues/02`): `marble-bust.glb` (GLB,
CC0 — Poly Haven "Marble Bust 01"), `stone-bridge.glb` (GLB, CC0 — OpenGameArt,
converted obj→glb with an authored MTL), and `racoonfamily.spz` (SPZ, MIT —
Niantic's official sample). Kale Fortress is deliberately left empty. Files live
in `backend/models/` (gitignored) and are **bind-mounted** into the API/nginx
containers (the `models` named volume was removed). The seed owns them — upsert +
prune, mirroring the location seed — and skips any whose file is absent.

Two non-obvious follow-ons:
- The `models` volume used to collide with the baked embedding model at
  `/app/models/embedding`; the embedding model moved to `/app/embedding`
  (Dockerfile + `env.localModelPath`) so the bind-mount wouldn't shadow it. Search
  re-verified (0.82 "castle" → Kale).
- The Matka SPZ is a **placeholder** (raccoon-family subject). A real landscape
  splat is 100s of MB and SuperSplat downloads are auth-gated — recorded as a
  known follow-up.

### PlayCanvas SPZ v4 migration (2026-10-17)

`@mkkellogg/gaussian-splats-3d` (frozen at 0.4.7) rejects SPZ v3+ — the real
Nikola Karev monument file was v3 and wouldn't load. The SPZ renderer was
migrated to the **PlayCanvas engine** (`playcanvas` npm), which reads SPZ **v4**:

- `ModelViewer.tsx`'s SPZ path is now a PlayCanvas `Application` (canvas +
  camera + `CameraControls` script + `gsplat` entity), frame-fitting the camera
  to the splat's bounding box. The GLB path (R3F) is unchanged.
- The `SpzParser` and `CameraControls` scripts import from
  `playcanvas/scripts/esm/…` (exported by the package); `types/playcanvas-scripts.d.ts`
  declares them.
- The ZSTD decoder WASM (`zstd.wasm.js`/`.wasm`) is vendored in
  `frontend/public/wasm/` and registered via `WasmModule.setConfig`.
- **v3→v4 conversion** (grilling): `POST /api/models` converts legacy (v1–3,
  gzip) `.spz` uploads to v4 synchronously before storing (`lib/spz.ts`); the
  seed converts non-v4 demo `.spz` files in place, idempotently. Conversion is
  CPU-only (~1s/M gaussians) but RAM scales ~20× file size — a 50 MB upload is
  memory-hungry in the API container (flagged).
- The demo files (raccoon, monument) were converted to v4; uploads now
  auto-convert, so Scaniverse/SuperSplat v3 files just work.

## 12. Bug ledger (root causes worth citing)

| Symptom | Root cause | Fix |
|---|---|---|
| API container crashed on boot | Prisma engine can't load openssl on Alpine | `node:20-slim` + `apt-get install openssl` |
| `libc.musl` binary errors after base-image change | Anonymous `node_modules` volume kept Alpine binaries shadowing the image | Targeted source mounts only (`src/`, `prisma/`, config files) |
| Reload at `http://localhost` logged the user out | CSRF allowlist only contained `localhost:5173` → refresh 403 → session cleared | Same-host Origin/Host hostname check |
| Create-location dialog invisible; clicks passed through to the map | Leaflet creates no stacking context (panes z ≤ 1000) vs dialog z-50 | Dialog overlay/content at z-[1000]/[1001] |
| POST after silent refresh would 400 | 401-retry rebuilt headers without `Content-Type` | Re-attach on retry |
| Two tabs refreshing simultaneously revoked the whole session | Same cookie presented twice = theft signal | Single-flight + cross-tab lock |
| API edits silently not applied in dev | `tsx watch` doesn't receive file-change events over Windows Docker bind mounts | Restart the container after backend edits (Vite already polls for the same reason) |
| New frontend dependency 500s (`/src/main.tsx`) in dev | `node_modules` is baked into the frontend image (not bind-mounted), so a host `npm install` never reaches the running container | Rebuild the frontend image — `docker compose up -d --build frontend` — after adding any dependency |
| Lightbox: clicking while zoomed only recentered the image | The unzoom ran in native `pointerup`, but the browser's follow-up `click` saw the freshly re-rendered (fitted) closure and re-zoomed | Do the whole zoom toggle in the native `pointerup` handler; no React `onClick` |
| Lightbox: opening on photo #1, the first click never zoomed (worked after navigating away and back) | The pointer-listener effect keyed on `[current, zoomed]` never re-ran when the dialog opened at index 0 — the component stays mounted while closed, so `current` was already 0 and the listeners that early-returned while closed were never attached | Add `open` to the effect's dependencies so it re-runs when the dialog opens |
| Lightbox: opening on the pinned thumbnail (any index) still wouldn't zoom on the first click | Listener attachment depended on ref-timing of a conditionally-attached slide ref (`ref={index === current ? slideRef : undefined}`) — on the opening commit the ref can point at the wrong slide or none, and nothing forces a re-attach | One capture-phase listener set on the always-mounted dialog content; the target slide is identified from the event via `[data-lightbox-slide]` — no ref-timing, works for every index |
| Lightbox: zoom dead everywhere after the content-level capture rewrite | Native capture-phase listeners on the Radix dialog content proved unreliable (interplay with Radix/embla's own listeners) | Dropped ALL native listeners: plain React `onPointer*` handlers on each slide, with embla's drag watching disabled while zoomed via the `watchDrag` option — embla-react reInits on option change and preserves the selected slide (verified in its source) |
| Lightbox: zooming after navigating slides jumped back to the first-opened image | The zoom toggle reInits embla, and `reActivate` merges the watched options OVER the preserved snap — so the `startIndex` still sitting in `opts` re-applied the originally-opened slide | Remove `startIndex` from the watched options; scroll to the clicked slide imperatively once in a `useLayoutEffect` (pre-paint). Without it, reInit keeps the current slide |
| Lightbox: Escape also closed the sidebar (X closed only the lightbox) | Radix dismisses on Escape from a document-CAPTURE listener; by the time the keydown reached the sidebar's window-level Escape handler, React had committed `lightboxIndex = null`, so the sidebar treated it as its own close | Handle Escape inside the dialog: `onEscapeKeyDown` preventDefault (Radix stays out of it) + React `onKeyDown` that closes and `stopPropagation()`s so the window listener never sees the event |

## 13. Remaining open work

- `models-3d` (3/3): demo models seeded — but the Matka SPZ is a placeholder (Niantic raccoon sample); a real landscape splat remains a follow-up.
- `frontend-map` 02 (partial): 3D viewer pane in the sidebar (carousel + upload are done — images/04); 03 (partial): viewport persistence across reloads; 05: marker icons only (its *zoom* half is superseded by map-filters) — needs-info.
- `deployment` (0/2): prod runbook (`docs/deployment.md`), backup rotation docs.
- Interactive browser pass: search, tile-layers, map-filters, sidebar-redesign, images UI, report-resolution, 3D viewer (build-verified only).
- Known residuals (documented in tickets): server-side grace period for just-rotated refresh tokens; tile caching for fully offline deployments.

## 14. Doc map

| Doc | Purpose |
|---|---|
| `THESIS_TECH_STACK.md` (v1.2) | Stack rationale, architecture, schema, flows — the thesis centerpiece |
| `docs/adr/0001-auth-jwt-over-keycloak.md` | Why hand-rolled JWT, not Keycloak |
| `docs/adr/0002-map-interaction-design.md` | Map UX decisions (sidebar, tooltips, locate) |
| `docs/used-technologies.md` | Catalog of every technology used, grouped by layer |
| `docs/technology-rationale.md` | Why each technology was selected and how the pieces correlate |
| `CONTEXT.md` | Domain vocabulary |
| `.scratch/README.md` | Tracker index (features → tickets → status) |
| `docs/implementation-status.md` | This file |
