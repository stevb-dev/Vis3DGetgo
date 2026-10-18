import { useEffect, useMemo, useState } from 'react'
import { Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, Marker, Tooltip, useMapEvents } from 'react-leaflet'
import { api } from '@/lib/api'
import { createCategoryIcon } from '@/lib/markerIcons'
import { useMapCenter } from '@/hooks/useMapCenter'
import { MapSizeFix, Recenter, ViewportPersist } from '@/components/mapEffects'
import LocateButton from '@/components/LocateButton'
import CategoryFilter from '@/components/CategoryFilter'
import SearchBox from '@/components/SearchBox'
import TileLayerController from '@/components/TileLayerController'
import TileLayerSwitcher from '@/components/TileLayerSwitcher'
import { isLocationCategory, LocationCategory, LocationSummary } from '@/lib/types'
import { DEFAULT_LAYER_ID, getLayer, isTileLayerId, type TileLayerId } from '@/lib/tileLayers'

/** Below this zoom (no category selected) the map collapses to nothing. */
const ZOOM_GATE = 12

/**
 * Read a numeric query param; missing, empty or non-numeric → null. (Naive
 * `Number(params.get(k))` turns an absent param into 0 — null island, not an
 * error — which silently overrode the geolocation start.)
 */
function readNumberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key)
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * Parse the persisted viewport (`?lat=&lng=&zoom=`) for the map's initial
 * position. Invalid or out-of-range values are ignored piece-wise so the
 * geolocation fallback still applies for whatever is missing.
 */
function parseViewport(params: URLSearchParams): { center?: [number, number]; zoom?: number } {
  const lat = readNumberParam(params, 'lat')
  const lng = readNumberParam(params, 'lng')
  const zoom = readNumberParam(params, 'zoom')
  const view: { center?: [number, number]; zoom?: number } = {}
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    view.center = [lat, lng]
  }
  if (zoom !== null && zoom >= 2 && zoom <= 19) {
    view.zoom = zoom
  }
  return view
}

/** Empty-map clicks close the sidebar (Leaflet doesn't fire this after a drag). */
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

/** In create mode, empty-map clicks pick a spot for the new location instead. */
function CreateClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  })
  return null
}

/** Track the live map zoom — the MapContainer `zoom` prop only applies on mount. */
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  })
  return null
}

/** The create panel's transient picked spot (not URL state — not deep-linkable). */
export interface PickedSpot {
  lat: number
  lng: number
}

export default function MapPage() {
  const navigate = useNavigate()
  const center = useMapCenter()

  // Create mode: the create panel (nested route /locations/new) must not be
  // treated as a selected location — `useMatch('/locations/:id')` also matches
  // it with id="new" (→ NaN). Guard everything on isCreateMode.
  const isCreateMode = useMatch('/locations/new') !== null
  const match = useMatch('/locations/:id')
  const selectedId = !isCreateMode && match ? Number(match.params.id) : null

  const [searchParams, setSearchParams] = useSearchParams()
  const fly = searchParams.get('fly') === '1'

  const rawCategory = searchParams.get('category')
  const activeCategory = isLocationCategory(rawCategory) ? rawCategory : null

  const rawLayer = searchParams.get('layer')
  const activeLayer = getLayer(isTileLayerId(rawLayer) ? rawLayer : DEFAULT_LAYER_ID)

  // Persisted viewport read once for the map's initial position. A URL
  // viewport wins over geolocation (same source-of-truth rule); absent or
  // invalid, the geolocation → Skopje fallback applies as before.
  const [initialView] = useState(() => parseViewport(searchParams))
  const initialZoom = initialView.zoom ?? 13
  // Effective center: the URL viewport (when present) is authoritative, so a
  // late geolocation resolve can't yank the map off the restored view.
  const effectiveCenter = initialView.center ?? center

  const [zoom, setZoom] = useState(initialZoom)

  // Transient create-mode state, owned here because the panel renders outside
  // MapContainer (an <Outlet> sibling) while the picked marker renders inside
  // it — the panel shares this via Outlet context.
  const [picked, setPicked] = useState<PickedSpot | null>(null)
  const [pickedCategory, setPickedCategory] = useState<LocationCategory>('MONUMENTS')

  // Leaving create mode resets the picked spot so re-entering starts clean.
  useEffect(() => {
    if (!isCreateMode) {
      setPicked(null)
      setPickedCategory('MONUMENTS')
    }
  }, [isCreateMode])

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

  // Preserve the active category filter + tile layer + viewport across
  // navigation. The transient `fly` hint is deliberately dropped — carrying
  // it would re-center.
  function navigateMap(path: string) {
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (activeLayer.id !== DEFAULT_LAYER_ID) params.set('layer', activeLayer.id)
    for (const key of ['lat', 'lng', 'zoom']) {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    }
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

  // Shared with the create panel through <Outlet context>. `navigateMap`
  // gives cancel/post-create the same param-preserving navigation as the map.
  const createContext = useMemo(
    () => ({ picked, setPicked, setPickedCategory, navigateMap }),
    [picked, navigateMap],
  )

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
          center={effectiveCenter}
          zoom={initialZoom}
          scrollWheelZoom
          className="h-[calc(100vh-3.5rem)] w-full"
        >
          <TileLayerController layer={activeLayer} />
          <Recenter center={effectiveCenter} flyTo={flyTarget} />
          <MapSizeFix />
          <ViewportPersist />
          {!isCreateMode && <MapClickHandler onMapClick={handleMapClick} />}
          {isCreateMode && <CreateClickCatcher onPick={(lat, lng) => setPicked({ lat, lng })} />}
          <ZoomTracker onZoomChange={setZoom} />
          <LocateButton />
          {!isCreateMode &&
            visibleLocations?.map((loc) => {
              const isSelected = selectedId === loc.id
              return (
                <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={createCategoryIcon(loc.category, isSelected)}
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
          {/* Picked spot in create mode: the category pin follows the form's
              category selection (grilling decision, 2026-10-18). */}
          {isCreateMode && picked && (
            <Marker
              position={[picked.lat, picked.lng]}
              icon={createCategoryIcon(pickedCategory, true)}
            />
          )}
        </MapContainer>

        {/* Search box (top-center, above the chips). */}
        {!isCreateMode && <SearchBox />}

        {/* Category filter overlay (below the search box). */}
        {!isCreateMode && <CategoryFilter />}

        {/* Tile layer switcher (bottom-left). */}
        <TileLayerSwitcher activeId={activeLayer.id} onSelect={selectLayer} />

        {/* Empty state: no markers visible (below the gate with no filter, or an
            empty category). Non-interactive so pan/zoom still work. */}
        {!isCreateMode && noVisibleMarkers && (
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

      {/* Location detail renders here as a sidebar at /locations/:id; the
          create panel at /locations/new (create-location-flow). */}
      <Outlet context={createContext} />
    </div>
  )
}
