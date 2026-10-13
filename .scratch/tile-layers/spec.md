# tile-layers — spec

Switchable Leaflet tile layers on the main map, using API-key-free providers.
Default is OpenFreeMap (vector, via MapLibre GL Leaflet); OpenTopoMap is the
raster second option; two more OpenFreeMap styles (Bright, Dark) are exposed.
A bottom-left square toggles default ↔ topo on click and reveals a hover menu
of all layers to its right.

## Decisions (grilling round, 2026-10-12)

- Providers must not require an API key.
- OpenFreeMap is **vector-only** (no raster tiles, no static-image generation —
  confirmed from their docs). It is rendered through `maplibre-gl` +
  `@maplibre/maplibre-gl-leaflet`; OpenTopoMap stays a plain raster `TileLayer`.
- Layers (id → label):
  - `liberty` — "Streets" — OpenFreeMap, **default**
  - `bright` — "Bright" — OpenFreeMap
  - `dark` — "Dark" — OpenFreeMap
  - `topo` — "Topographic" — OpenTopoMap
- The OpenFreeMap "3D" view was **dropped**: it is Liberty rendered with
  pitch ≈ 60° / bearing ≈ 55° (no DEM), and MapLibre GL Leaflet has no
  rotation/bearing/pitch support. `dark` replaced it as the third style.
- Default = `liberty`, **reset every session** (no persistence).
- Main map only; the create-location map is unchanged.
- Bottom-left square shows the **active layer's thumbnail**; **click toggles**
  default ↔ topo ("remember last style": Topo ↔ the last-picked OpenFreeMap
  style, defaulting to Liberty); **hover** reveals the menu to the right.
- Menu: one square div per layer (thumbnail + type label) adjacent to the
  trigger; hides **500 ms** after leaving both the trigger and the menu.
- Thumbnails are bundled static PNGs under `frontend/public/layers/`.

## Attribution

- OpenFreeMap: `OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap`
- OpenTopoMap: `© OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)`

## Tickets

- `01-maplibre-gl-leaflet-setup.md`
- `02-tile-layer-config.md`
- `03-tile-layer-controller.md`
- `04-tile-layer-switcher.md`
- `05-layer-thumbnails.md`
