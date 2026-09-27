# CONTEXT.md — Domain Context

Single-context overview of the **Geospatial 3D Visualization Platform** (thesis project): an on-premise, Dockerized web application. Users roam a Leaflet map, click locations to view pre-seeded Three.js 3D models, upload images to a per-location carousel, and create new locations.

## Core concepts

- **Location**: a point on the map (lat/lng). Pre-seeded (userId null, admin-managed) or user-created (owned by a User). Optionally has one 3D Model; collects Images into a carousel.
- **Model**: a pre-seeded GLB file, 1:1 with a Location. Registered by an admin only.
- **Image**: a user upload to a Location. WebP after server-side optimization. Ordered via `Image.order` to form the carousel. Owned by the uploading User.
- **Carousel**: the ordered image list of one Location.
- **Thumbnail**: the first image of a Location by carousel order — exposed on the locations list endpoint, used by the map tooltip.
- **Sidebar**: the location detail panel rendered next to the map at `/locations/:id` (nested route — the map stays mounted). Closed by X, Escape, empty-map click, or re-clicking the selected marker.
- **Locate button**: bottom-right map control that flies the map to the user's position (min zoom 15) and drops a temporary pulse dot.
- **Auth**: 15-minute JWT access token (SPA memory + sessionStorage, `Authorization: Bearer`) + opaque 7-day refresh token (httpOnly cookie, SHA-256 hash in DB, rotated on use; reuse revokes the token family). Roles: `USER`, `ADMIN`.
- **Roles**: `USER` — read everything, create locations, edit/delete own locations without a model or foreign images, upload/delete own images. `ADMIN` — additionally edits/deletes any location and registers models.

## Map UX conventions

- Marker click → open sidebar. Never a popup (removed — see ADR-0002).
- Map starts at browser geolocation; falls back to Skopje when unavailable or denied.
- Overlays on the map need z-index > 1000 (Leaflet creates no stacking context).

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
