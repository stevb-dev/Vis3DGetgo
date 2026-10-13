# 03: Tile layer controller

Status: ready-for-agent
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
- The create-location map keeps its own hardcoded OSM `TileLayer` (out of scope).
