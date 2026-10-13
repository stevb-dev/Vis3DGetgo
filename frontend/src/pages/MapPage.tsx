import { useMemo } from 'react'
import { Outlet, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, Marker, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import { api } from '@/lib/api'
import { defaultIcon, selectedIcon } from '@/lib/leafletIcons'
import { useMapCenter } from '@/hooks/useMapCenter'
import { MapSizeFix, Recenter } from '@/components/mapEffects'
import LocateButton from '@/components/LocateButton'
import { LocationSummary } from '@/lib/types'

// OSM tiles are used for light demo traffic (see the OSM tile usage policy —
// an on-premise deployment would serve its own tile cache).
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Empty-map clicks close the sidebar (Leaflet doesn't fire this after a drag). */
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const center = useMapCenter()

  const match = useMatch('/locations/:id')
  const selectedId = match ? Number(match.params.id) : null

  const [searchParams] = useSearchParams()
  const fly = searchParams.get('fly') === '1'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get<{ locations: LocationSummary[] }>('/locations'),
  })

  const selected = data?.locations.find((loc) => loc.id === selectedId)

  // Memoized so FlyTo only reacts to the target coords changing, not re-renders.
  const flyTarget = useMemo(
    () => (fly && selected ? ([selected.latitude, selected.longitude] as [number, number]) : null),
    [fly, selected?.latitude, selected?.longitude],
  )

  function handleMarkerClick(locId: number) {
    // Clicking the already-selected marker toggles the sidebar closed.
    if (selectedId === locId) navigate('/')
    else navigate(`/locations/${locId}`)
  }

  function handleMapClick() {
    if (selectedId) navigate('/')
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="relative h-[calc(100vh-3.5rem)] min-w-0 flex-1"
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
        <Recenter center={center} flyTo={flyTarget} />
        <MapSizeFix />
        <MapClickHandler onMapClick={handleMapClick} />
        <LocateButton />
        {data?.locations.map((loc) => {
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

      {/* Location detail renders here as a sidebar at /locations/:id. */}
      <Outlet />

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
  )
}
