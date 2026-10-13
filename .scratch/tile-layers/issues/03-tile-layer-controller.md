# 03: Tile layer controller

Status: resolved
Feature: tile-layers
Blocked by: 01, 02

## Context

react-leaflet v4 has no component for a MapLibre GL layer. Render the active
layer imperatively from inside `MapContainer`, swapping cleanly on change.

## Requirements

- [ ] New `frontend/src/components/TileLayerController.tsx` (rendered inside `MapContainer`), prop `layer: TileLayerDef`.
- [ ] `useMap()` + `useEffect` keyed on `layer.id`:
      - vector: `maplibreGL({ style: layer.styleUrl, attribution: layer.attribution })`, keep the returned layer in a ref, `.addTo(map)`.
      - raster: `L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: 17 })`.
      - Remove the previous layer before adding the next; clean up on unmount.
- [ ] Attribution stays correct per layer (Leaflet's attribution control picks up each layer's `attribution`).
- [ ] In `frontend/src/pages/MapPage.tsx`: remove the hardcoded `TILE_URL`/`TILE_ATTRIBUTION` and the static `<TileLayer>`, replace with `<TileLayerController layer={activeLayer} />`.

## Notes

- Markers/tooltips sit on panes above the tile pane, so swapping the base layer under them is transparent.
- The create-location map now reuses `TileLayerController` + `?layer=` (see spec, 2026-10-14 round) — its own hardcoded OSM `TileLayer` was removed.

## Comments

- 2026-10-13 (agent): Implemented `TileLayerController.tsx`. Vector renders via `maplibreGL({ style, attributionControl: { customAttribution } })` (the adapter's option — not a top-level `attribution`); raster via `L.tileLayer(url, { attribution, maxZoom, subdomains })`. Swapped on `layer.id` change; cleaned up on unmount.
