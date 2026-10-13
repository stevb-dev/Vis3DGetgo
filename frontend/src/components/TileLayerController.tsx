import { useEffect } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import type { TileLayerDef } from '@/lib/tileLayers'

/**
 * Imperatively renders the active base layer and swaps it cleanly when the
 * layer changes. react-leaflet v4 has no component for a MapLibre GL layer, so
 * this drives the map instance directly:
 *   - vector (OpenFreeMap) → maplibreGL({ style, attributionControl })
 *   - raster (OpenTopoMap) → L.tileLayer(url, { attribution, maxZoom })
 *
 * Markers/tooltips sit on panes above the tile pane, so swapping the base layer
 * under them is transparent.
 */
export default function TileLayerController({ layer }: { layer: TileLayerDef }) {
  const map = useMap()

  useEffect(() => {
    const created: L.Layer =
      layer.kind === 'vector' && layer.styleUrl
        ? maplibreGL({
            style: layer.styleUrl,
            attributionControl: { customAttribution: layer.attribution },
          })
        : L.tileLayer(layer.url!, {
            attribution: layer.attribution,
            maxZoom: layer.maxZoom ?? 18,
            subdomains: layer.subdomains ?? 'abc',
          })

    created.addTo(map)
    // Remove the previous layer before the next (React runs the prior effect's
    // cleanup first), and clean up on unmount.
    return () => {
      created.remove()
    }
  }, [layer, map])

  return null
}
