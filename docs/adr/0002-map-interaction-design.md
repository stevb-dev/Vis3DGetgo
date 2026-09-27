# ADR-0002: Map interaction design (sidebar detail, tooltips, locate button)

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Thesis author (+ agent, via a grilling round using an interactive questionnaire)

## Context

The first version of the map opened a Leaflet popup on marker click *and* navigated to the location detail at the same time — a popup "that does nothing" (user's words) while the sidebar already showed everything. Marker interaction, detail presentation, and map centering were redesigned through a grilling round.

## Decision

| # | Decision |
|---|---|
| 1 | Marker click **opens the sidebar directly**; the popup is removed entirely |
| 2 | Clicking empty map space closes the sidebar (Leaflet suppresses click-after-drag, so panning doesn't trigger it) |
| 3 | The selected location's marker is **recolored** (hue-rotated pin + shadow) |
| 4 | Desktop-first; touch is tolerable but not designed for |
| 5 | Hover **tooltip** shows name + thumbnail (first image by carousel order) — list endpoint exposes a `thumbnail` field; name-only while the location has no images |
| 6 | **Escape** closes the sidebar |
| 7 | Clicking the already-selected marker **toggles** the sidebar closed |
| 8 | **Locate button** (bottom-right, above the OSM attribution): one-shot recenter, `flyTo` with zoom `max(current, 15)`, temporary pulsing dot, spinner while locating, failures via sonner toasts, on **both** maps |
| 9 | Map starts at the browser's geolocation; fallback **Skopje** (`41.9973, 21.428`) when unavailable/denied |
| 10 | `GuestRoute` redirects authenticated users away from `/login` and `/register` |

## Consequences

- The URL remains the single source of truth: `/locations/:id` is a nested route under the map page; the sidebar renders via `<Outlet />` and the map instance survives open/close (viewport preserved; `invalidateSize` on route change).
- **Z-index hazard documented**: Leaflet's container creates no stacking context, so any overlay over the map needs z-index > 1000 (the create-location dialog bug was exactly this).
- `sonner` added as a dependency (also planned for future upload-error feedback).
- Seed data moved to Skopje; the seed script owns the demo dataset (prunes stale demo rows).

## Related

- `.scratch/frontend-map/` (tickets 01–04)
- `docs/implementation-status.md` §4, §5
