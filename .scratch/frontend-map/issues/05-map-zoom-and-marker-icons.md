# 05: Map zoom & marker icons

Status: resolved
Feature: frontend-map

## Context

Captured as a future enhancement (TODO), not scoped for implementation yet. Today the map uses **fixed zoom** (`zoom={13}` in `MapPage`, locate fly-to at `max(zoom, 15)`) and the **default Leaflet blue marker icons** (`defaultIcon` / `selectedIcon` in `frontend/src/lib/leafletIcons.ts`). The intent is to revisit how the map zooms and what the markers look like — specifics are still open.

## Requirements

Decisions resolved (grilling round, 2026-10-18):

- [x] **Icons** — per-location-category pins: a colored CSS teardrop (distinct Tailwind 500 hue per category) carrying the category's white lucide icon (same icon as the filter chips). Selected pin = stronger 600 shade, slightly larger, white ring; anchor stays on the pin point. Touch points: new `frontend/src/lib/markerIcons.ts` (`createCategoryIcon`, SVG snapshots of lucide v0.447.0), `.cat-pin*` styles in `index.css`, marker rendering in `frontend/src/pages/MapPage.tsx`. The old `selectedIcon` recolor is removed.
- [x] **Zoom** — **wontfix**: keep fixed `zoom={13}` + geolocation start + fly-to on selection. The viewport now persists across reloads via `?lat=&lng=&zoom=` (ticket 03), which covers the reload-restoration half; no fit-bounds/clamp behavior wanted.
- [x] (If in scope) **Tile source** — out of scope; stays a known residual in `docs/implementation-status.md` §7.

## Notes

- The `.marker-selected` recolor (`index.css`) is the only current icon customization.
- Marker clustering / zoom-dependent icon density is a possible future direction if the dataset grows past the demo set.

## Comments

- 2026-10-10 (user): Captured as a future TODO; exact desired zoom + icon behaviour still TBD — see Requirements.
- 2026-10-18 (grilling round): Icons = per-category colored pins with lucide icons; zoom = keep as-is (wontfix); tile source = out of scope. Ticket resolved on the icons landing.
- 2026-10-18 (agent): Implemented per-category pins. `lib/markerIcons.ts` builds a `divIcon` teardrop per category (hue + lucide icon snapshot matching the chip icons) with a larger/ringed selected variant; `leafletIcons.ts` keeps `defaultIcon` (still used by the create-location picker) and drops `selectedIcon`; the `.marker-selected` CSS is replaced by `.cat-pin*`. Zoom behavior unchanged (wontfix, recorded above). Verified by `tsc` + vite build; manual browser pass pending.
