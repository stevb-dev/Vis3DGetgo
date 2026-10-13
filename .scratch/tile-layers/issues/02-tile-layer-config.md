# 02: Tile layer config

Status: ready-for-agent
Feature: tile-layers

## Context

A single source of truth for the selectable layers. Replaces the hardcoded
`TILE_URL` / `TILE_ATTRIBUTION` constants in `frontend/src/pages/MapPage.tsx`.

## Requirements

- [ ] New `frontend/src/lib/tileLayers.ts` exporting a typed config:
      ```ts
      type TileLayerId = 'liberty' | 'bright' | 'dark' | 'topo'
      interface TileLayerDef {
        id: TileLayerId
        label: string          // 'Streets' | 'Bright' | 'Dark' | 'Topographic'
        provider: 'OpenFreeMap' | 'OpenTopoMap'
        kind: 'vector' | 'raster'
        styleUrl?: string      // vector: OpenFreeMap style URL
        url?: string           // raster: {s}/{z}/{x}/{y} template
        attribution: string
        thumbnail: string      // '/layers/<id>.png'
      }
      ```
- [ ] `TILE_LAYERS: TileLayerDef[]` in menu order: `liberty`, `bright`, `dark`, `topo`.
- [ ] Style URLs: `https://tiles.openfreemap.org/styles/liberty|bright|dark`.
- [ ] Topo URL: `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` with `maxZoom: 17` and `subdomains: 'abc'` (record `maxZoom` on the def).
- [ ] Attributions (exact):
      - OpenFreeMap: `OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap`
      - OpenTopoMap: `© OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)`
- [ ] `DEFAULT_LAYER_ID = 'liberty'`.
- [ ] Helpers: `getLayer(id)`, `isTopo(id)`, and a pure `toggleLayer(activeId, lastOpenFreeMapId)` returning the next active id (Topo ↔ the remembered OpenFreeMap style; see 04 for the `lastOpenFreeMapId` bookkeeping).

## Notes

- Keep this file free of React/Leaflet imports so it stays trivially testable.
