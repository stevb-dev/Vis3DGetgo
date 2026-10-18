# CONTEXT.md — Domain Context

Single-context overview of the **Geospatial 3D Visualization Platform** (thesis project): an on-premise, Dockerized web application. Users roam a Leaflet map, click locations to view pre-seeded Three.js 3D models, upload images to a per-location carousel, and create new locations.

## Core concepts

- **Location**: a point on the map (lat/lng). Pre-seeded (userId null, admin-managed) or user-created (owned by a User). Optionally has one 3D Model; collects Images into a carousel.
- **Model**: a pre-seeded 3D file — GLB (Draco mesh) or SPZ (3D Gaussian splat) — 1:1 with a Location. Uploaded/registered by an admin only; `Model.format` tells the viewer which renderer to use. Seed-owned demo models carry `Model.seeded = true` (mirrors `Location.seeded`); the seed prunes only its own flagged rows, so an admin upload on a seeded location survives re-seeding. Only SPZ **v4** is renderable — the backend converts v1–3 on upload/seed.
- **Image**: a user upload to a Location. WebP after server-side optimization (sharp, ≤1200×800). Ordered via `Image.order` to form the carousel. Owned by the uploading User. Anyone may upload to any Location (open carousel); junk is handled by Reports.
- **Carousel**: the ordered image list of one Location. Creation-order only — there is deliberately no reorder endpoint (grilling decision: reordering opened a thumbnail-hijack hole). Deleting an image shifts later orders down (contiguous 1..N).
- **Thumbnail**: the image shown on the map tooltip — the admin-pinned image (`Location.thumbnailImageId`) or, when unpinned, the first image by carousel order. The location creator may pick it from their initial upload batch; after that, only admins change it (`PATCH /api/locations/:id/thumbnail`).
- **Report**: a flag on an Image or a Location (SPAM / INAPPROPRIATE / WRONG_LOCATION / BROKEN / OTHER), reviewed by admins on `/admin/reports`. One report per user per target; the reporter's name is visible to admins only; reports cascade with their target. Resolution is two-action: the admin **deletes** the content (soft-delete) or **dismisses** the report; `ReportStatus` is `OPEN | RESOLVED | DISMISSED` (RESOLVED = content deleted), closed reports carry `closedAt` + an optional admin `note`.
- **Soft-delete**: moderation never hard-deletes — `Image.deletedAt` / `Location.deletedAt` hide a row from every view (a location delete cascades `deletedAt` to its child images; files stay on disk). Soft-deleted content is excluded from all reads and 404s on direct fetch.
- **Notification**: an in-app, snapshot-based notice to a content owner when moderation removes their content (content name + category + optional note, never the reporter's identity). Surfaced from a header bell with an unread badge; opening the panel marks all read.
- **My reports**: a logged-in user's own reports with their outcome (Open / Resolved / Dismissed + the dismiss note), at `/my-reports`. No unread marker.
- **Unread badge (admin)**: the header "Reports" link shows a count of OPEN reports created after the admin's last visit (`User.lastSeenReportsAt`), reset when the admin views the Open tab.
- **Seeded location**: one of the 4 demo Skopje landmarks — `seeded = true`, owned by the seed's demo curator account (`SEED_DEMO_*`, an ADMIN persona), badged "Pre-seeded demo location" in the sidebar.
- **Category**: a fixed 11-value `LocationCategory` taxonomy on every Location (MUSEUMS … FOOD_AND_DRINK, NATURE). Required on create, editable, backfilled to MONUMENTS. Drives future per-category marker icons.
- **Category filter**: a single-row, horizontally-scrollable chip row over the map toggles a single active `LocationCategory`, encoded in the URL (`?category=<value>`, ADR-0002 — shareable, survives reload). Each chip carries a lucide category icon; left/right edge arrows scroll the row. With a category active, only that category's pins render (at all zooms); with none, below zoom 12 the map hides its pins (a subtle empty-state hint pinned to the bottom), at/above 12 everything shows. The selected location's pin is always visible.
- **Tile layer**: the map's switchable base layer — OpenFreeMap (vector, Streets/Bright/Dark via MapLibre GL) or OpenTopoMap (raster, Topographic). Switched from a bottom-left control; the active layer is encoded in the URL (`?layer=<id>`, default `liberty`).
- **Search**: semantic, multilingual (English + Macedonian) free-text search over locations, from a search box top-center. Local `multilingual-e5-small` embeddings (384-dim, q8, baked into the image) + pgvector cosine ranking — no external API. Selecting a result flies to `/locations/:id?fly=1` and clears the category filter (search and filter are independent discovery modes).
- **Saved location**: a per-user bookmark (`SavedLocation`, unique user+location pair). Toggled from the sidebar header; listed on `/saved`.
- **Share slug**: a human-readable share URL `/locations/<slug>/@<lat>,<lng>`; the name is cosmetic and the coordinates (5-decimal) are the lookup key, resolving to the canonical `/locations/:id`.
- **Sidebar**: the location detail panel rendered next to the map at `/locations/:id` (nested route — the map stays mounted). Header (title + clamped description subtitle + Save/Share/Edit/Delete/Report/Close) → meta (badge + category label) → images (carousel above dropzone) → 3D model (a button opening a viewer modal; hidden when absent). Closed by X, Escape, empty-map click, or re-clicking the selected marker.
- **Create location**: the "New location" flow at `/locations/new`, a nested route under the same map (single live `MapContainer` — entering/leaving never resets the viewport). Create mode hides markers/search/chips; an empty-map click picks a spot (a category pin matching the form's category selection drops; re-clicking moves it) and the form fills a right-side panel (name/description/category + "Pinned at lat,lng"). Cancel (button or Escape) returns to `/` preserving filter/layer/viewport, with a discard prompt when any field changed from default. Successful create opens `/locations/:id` without `?fly=1` — the map stays put.
- **Locate button**: bottom-right map control that flies the map to the user's position (min zoom 15) and drops a temporary pulse dot.
- **Auth**: 15-minute JWT access token (SPA memory + sessionStorage, `Authorization: Bearer`) + opaque 7-day refresh token (httpOnly cookie, SHA-256 hash in DB, rotated on use; reuse revokes the token family). Roles: `USER`, `ADMIN`.
- **Roles**: `USER` — read everything, create locations, edit/delete own locations without a model or foreign images, upload/delete own images. `ADMIN` — additionally edits/deletes any location and registers models.

## Map UX conventions

- Marker click → open sidebar. Never a popup (removed — see ADR-0002).
- Map starts at browser geolocation; falls back to Skopje when unavailable or denied.
- Overlays on the map need z-index > 1000 (Leaflet creates no stacking context).
- External entry (a `/saved` card or a share link) lands on `/locations/:id?fly=1`; the map flies to the location. In-place marker clicks do not re-center.
- A category filter (`?category=`) gates which pins show; with no category selected, pins hide below zoom 12 (an empty-state hint appears). The selected pin is always visible.
- A tile-layer switcher (bottom-left) picks the base layer; the active layer lives in `?layer=`.
- A search box (top-center, above the chips) does semantic search; selecting a result flies to the location and clears `?category=`.

## Sources of truth

- Architecture + stack rationale: `THESIS_TECH_STACK.md`
- Build log + verification evidence: `docs/implementation-status.md`
- Database schema: `backend/prisma/schema.prisma` (+ committed migrations)
- Decisions: `docs/adr/`
- Feature specs + tickets: `.scratch/<feature-slug>/` (index: `.scratch/README.md`, conventions: `docs/agents/issue-tracker.md`)

## Key decisions (summary)

- PostGIS for spatial queries (`ST_DWithin` on geography with a functional GIST index), Leaflet over MapLibre, Three.js + R3F over Babylon, local volumes + Nginx over S3.
- Auth: hand-rolled JWT with refresh rotation over Keycloak — ADR-0001.
- Map interaction: sidebar + tooltips + locate button, URL as source of truth — ADR-0002.
- Demo dataset: Skopje landmarks; the seed script owns demo data (prunes stale rows).
