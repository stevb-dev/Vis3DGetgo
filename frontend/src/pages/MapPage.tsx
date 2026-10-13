import { useMemo, useState } from 'react'
import { Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, Marker, Tooltip, useMapEvents } from 'react-leaflet'
import { api } from '@/lib/api'
import { defaultIcon, selectedIcon } from '@/lib/leafletIcons'
import { useMapCenter } from '@/hooks/useMapCenter'
import { MapSizeFix, Recenter } from '@/components/mapEffects'
import LocateButton from '@/components/LocateButton'
import CategoryFilter from '@/components/CategoryFilter'
import TileLayerController from '@/components/TileLayerController'
import TileLayerSwitcher from '@/components/TileLayerSwitcher'
import { isLocationCategory, LocationSummary } from '@/lib/types'
import { DEFAULT_LAYER_ID, getLayer, isTileLayerId, type TileLayerId } from '@/lib/tileLayers'

/** Below this zoom (no category selected) the map collapses to nothing. */
const ZOOM_GATE = 12

/** Empty-map clicks close the sidebar (Leaflet doesn't fire this after a drag). */
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

/** Track the live map zoom — the MapContainer `zoom` prop only applies on mount. */
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  })
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const center = useMapCenter()

  const match = useMatch('/locations/:id')
  const selectedId = match ? Number(match.params.id) : null

  const [searchParams, setSearchParams] = useSearchParams()
  const fly = searchParams.get('fly') === '1'

  const rawCategory = searchParams.get('category')
  const activeCategory = isLocationCategory(rawCategory) ? rawCategory : null

  const rawLayer = searchParams.get('layer')
  const activeLayer = getLayer(isTileLayerId(rawLayer) ? rawLayer : DEFAULT_LAYER_ID)

  const [zoom, setZoom] = useState(13)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ locations: LocationSummary[] }>('/locations'),
  })

  const selected = data?.locations.find((loc) => loc.id === selectedId)

  // Marker visibility predicate (.scratch/map-filters spec): the selected pin
  // always renders; otherwise a category filter applies at all zooms, else the
  // zoom gate (hidden below ZOOM_GATE). External entry (?fly=1) is covered by
  // the selected pin — the fly target is the same id as `selectedId`.
  const visibleLocations = data?.locations.filter((loc) => {
    if (loc.id === selectedId) return true
    if (activeCategory) return loc.category === activeCategory
    return zoom >= ZOOM_GATE
  })

  const noVisibleMarkers = data != null && visibleLocations?.length === 0

  // Memoized so FlyTo only reacts to the target coords changing, not re-renders.
  const flyTarget = useMemo(
    () => (fly && selected ? ([selected.latitude, selected.longitude] as [number, number]) : null),
    [fly, selected?.latitude, selected?.longitude],
  )

  // Preserve the active category filter + tile layer across navigation. The
  // transient `fly` hint is deliberately dropped — carrying it would re-center.
  function navigateMap(path: string) {
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (activeLayer.id !== DEFAULT_LAYER_ID) params.set('layer', activeLayer.id)
    const s = params.toString()
    navigate(s ? `${path}?${s}` : path)
  }

  function selectLayer(id: TileLayerId) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id === DEFAULT_LAYER_ID) next.delete('layer')
        else next.set('layer', id)
        return next
      },
      { replace: true },
    )
  }

  function handleMarkerClick(locId: number) {
    // Clicking the already-selected marker toggles the sidebar closed.
    if (selectedId === locId) navigateMap('/')
    else navigateMap(`/locations/${locId}`)
  }

  function handleMapClick() {
    if (selectedId) navigateMap('/')
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Map + its overlays, anchored to the map area only so they reflow when
          the sidebar shrinks the map (rather than centering over the full row). */}
      <div className="relative min-w-0 flex-1">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          className="h-[calc(100vh-3.5rem)] w-full"
        >
          <TileLayerController layer={activeLayer} />
          <Recenter center={center} flyTo={flyTarget} />
          <MapSizeFix />
          <MapClickHandler onMapClick={handleMapClick} />
          <ZoomTracker onZoomChange={setZoom} />
          <LocateButton />
          {visibleLocations?.map((loc) => {
            const isSelected = selectedId === loc.id
            return (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                icon={isSelected ? selectedIcon : defaultIcon}
                eventHandlers={{ click: () => handleMarkerClick(loc.id) }}
              >
                <Tooltip direction="top" offset={[0, -34]} opacity={1}>
                  <div className="flex flex-col items-center gap-1">
                    {loc.thumbnail && (
                      <img
                        src={loc.thumbnail.filePath}
                        alt={loc.name}
                        loading="lazy"
                        className="h-24 w-32 rounded-md object-cover"
                      />
                    )}
                    <span className="text-xs font-medium">{loc.name}</span>
                  </div>
                </Tooltip>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Category filter overlay (sits above the map, below the loading veil). */}
        <CategoryFilter />

        {/* Tile layer switcher (bottom-left). */}
        <TileLayerSwitcher activeId={activeLayer.id} onSelect={selectLayer} />

        {/* Empty state: no markers visible (below the gate with no filter, or an
            empty category). Non-interactive so pan/zoom still work. */}
        {noVisibleMarkers && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[1000] flex justify-center">
            <p className="rounded-md bg-background/80 px-3 py-1.5 text-sm text-muted-foreground shadow">
              No locations here — pick a category or zoom in
            </p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60">
            <p className="rounded-md bg-background px-4 py-2 text-sm shadow">Loading locations…</p>
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60">
            <p className="rounded-md bg-background px-4 py-2 text-sm text-destructive shadow">
              Failed to load locations
            </p>
          </div>
        )}
      </div>

      {/* Location detail renders here as a sidebar at /locations/:id. */}
      <Outlet />
    </div>
  )
}
