# 01: Leaflet map with location markers

Status: resolved
Feature: frontend-map

## Context

`MapPage` is a placeholder. Deps installed: leaflet 1.9, react-leaflet 4, `@types/leaflet`.

## Requirements

- [ ] `MapContainer` with OSM tiles (on-premise friendly; note tile-usage policy in the thesis)
- [ ] Markers from `GET /api/locations` (TanStack Query, key `['locations']`)
- [ ] Marker popup preview (name + image count) and click → navigate `/locations/:id`
- [ ] Custom marker icons (Leaflet default icon breaks under bundlers — fix icon URLs)
- [ ] Import `leaflet/dist/leaflet.css`
- [ ] Map fits the viewport; initial view over the seeded demo area

## Notes

- Leaflet handles the 2D map; 3D is entirely in the detail pane (Three.js).

## Comments

- 2026-09-27 (agent): Implemented in `frontend/src/pages/MapPage.tsx` (done as the unblocking dependency for locations/03).
  - `MapContainer` + OSM tiles + markers from `GET /api/locations` (TanStack Query, key `['locations']`), popup with name/image count/model flag and a View button → `/locations/:id`.
  - Bundler-safe marker icons via `frontend/src/lib/leafletIcons.ts` (explicit png imports).
  - `leaflet/dist/leaflet.css` imported in `main.tsx`. Loading/error overlays included.
- 2026-09-27 (grilling round): Popup removed — marker interaction redesigned: click opens the sidebar directly (clicking the selected marker toggles it closed), empty-map click and Escape close it, selected marker is recolored (`selectedIcon` + `.marker-selected` CSS), and a hover **tooltip** shows the name + thumbnail (first image by carousel order, from the new `thumbnail` field on `GET /api/locations` — null until uploads exist).
