# 05: Map zoom & marker icons (future TODO)

Status: needs-info
Feature: frontend-map

## Context

Captured as a future enhancement (TODO), not scoped for implementation yet. Today the map uses **fixed zoom** (`zoom={13}` in `MapPage`, locate fly-to at `max(zoom, 15)`) and the **default Leaflet blue marker icons** (`defaultIcon` / `selectedIcon` in `frontend/src/lib/leafletIcons.ts`). The intent is to revisit how the map zooms and what the markers look like — specifics are still open.

## Requirements

Open decision points to resolve before this is `ready-for-agent`:

- [ ] **Icons** — decide the desired marker behavior:
  - custom icons per location type/category, or
  - visual distinction between seeded vs user-created locations, or
  - thumbnail-style markers, or
  - keep Leaflet defaults (this ticket then closes as `wontfix`).
  - Touch points: `frontend/src/lib/leafletIcons.ts`, marker rendering in `frontend/src/pages/MapPage.tsx`.
- [ ] **Zoom** — decide the desired behavior:
  - fit-bounds to all markers on load, or
  - per-location zoom on selection, or
  - min/max zoom clamps.
  - Touch points: `zoom={13}` in `MapPage`, `max(zoom, 15)` in `components/LocateButton.tsx`.
- [ ] (If in scope) **Tile source** — self-hosted tiles vs OSM; already noted as a known residual in `docs/implementation-status.md` §7.

## Notes

- The `.marker-selected` recolor (`index.css`) is the only current icon customization.
- Marker clustering / zoom-dependent icon density is a possible future direction if the dataset grows past the demo set.

## Comments

- 2026-10-10 (user): Captured as a future TODO; exact desired zoom + icon behaviour still TBD — see Requirements.
