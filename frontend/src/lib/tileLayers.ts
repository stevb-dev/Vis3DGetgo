// Single source of truth for the selectable tile layers (tile-layers ticket 02).
// Kept free of React/Leaflet imports so it stays trivially testable.

export type TileLayerId = 'liberty' | 'bright' | 'dark' | 'topo'

export interface TileLayerDef {
  id: TileLayerId
  label: string
  provider: 'OpenFreeMap' | 'OpenTopoMap'
  kind: 'vector' | 'raster'
  /** vector: OpenFreeMap style URL */
  styleUrl?: string
  /** raster: {s}/{z}/{x}/{y} template */
  url?: string
  maxZoom?: number
  subdomains?: string
  attribution: string
  /** bundled static preview under frontend/public/layers/ */
  thumbnail: string
}

const OPENFREEMAP_ATTRIBUTION = 'OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap'

export const TILE_LAYERS: TileLayerDef[] = [
  {
    id: 'liberty',
    label: 'Streets',
    provider: 'OpenFreeMap',
    kind: 'vector',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: OPENFREEMAP_ATTRIBUTION,
    thumbnail: '/layers/liberty.png',
  },
  {
    id: 'bright',
    label: 'Bright',
    provider: 'OpenFreeMap',
    kind: 'vector',
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    attribution: OPENFREEMAP_ATTRIBUTION,
    thumbnail: '/layers/bright.png',
  },
  {
    id: 'dark',
    label: 'Dark',
    provider: 'OpenFreeMap',
    kind: 'vector',
    styleUrl: 'https://tiles.openfreemap.org/styles/dark',
    attribution: OPENFREEMAP_ATTRIBUTION,
    thumbnail: '/layers/dark.png',
  },
  {
    id: 'topo',
    label: 'Topographic',
    provider: 'OpenTopoMap',
    kind: 'raster',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    subdomains: 'abc',
    attribution: '© OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)',
    thumbnail: '/layers/topo.png',
  },
]

export const DEFAULT_LAYER_ID: TileLayerId = 'liberty'

const LAYER_IDS = TILE_LAYERS.map((l) => l.id)

/** Type guard for a `?layer=` URL value (mirrors `isLocationCategory`). */
export function isTileLayerId(value: string | null | undefined): value is TileLayerId {
  return (LAYER_IDS as string[]).includes(value as string)
}

export function getLayer(id: TileLayerId): TileLayerDef {
  return TILE_LAYERS.find((l) => l.id === id) ?? TILE_LAYERS[0]
}
