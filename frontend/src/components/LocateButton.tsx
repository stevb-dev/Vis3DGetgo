import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { Loader2, LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const MIN_ZOOM = 15
const LOCATE_TIMEOUT_MS = 5000
const PULSE_LIFETIME_MS = 5000

function addPulse(map: L.Map, latlng: [number, number]): L.Marker {
  const icon = L.divIcon({
    className: '',
    html: '<div class="locate-pulse"><span class="locate-pulse-dot"></span></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
  return L.marker(latlng, { icon, interactive: false, zIndexOffset: 1000 }).addTo(map)
}

/**
 * "Center on my location" overlay button:
 * - one-shot: re-queries geolocation on every click (5s timeout)
 * - flies to the position, zooming to at least 15
 * - drops a temporary pulsing dot (5s) at the position
 * - spinner while locating; failures surface as sonner toasts
 * Rendered inside <MapContainer> so it can use the map instance.
 */
export default function LocateButton() {
  const map = useMap()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pulseRef = useRef<L.Marker | null>(null)
  const [locating, setLocating] = useState(false)

  // Keep button clicks/scroll from leaking to the map (a leaked click would
  // close the sidebar on the main map or pin a spot on the create page).
  useEffect(() => {
    const el = buttonRef.current
    if (!el) return
    L.DomEvent.disableClickPropagation(el)
    L.DomEvent.disableScrollPropagation(el)
  }, [])

  function handleLocate() {
    if (locating) return
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        const zoom = Math.max(map.getZoom(), MIN_ZOOM)
        map.flyTo(latlng, zoom, { duration: 0.8 })

        pulseRef.current?.remove()
        pulseRef.current = addPulse(map, latlng)
        setTimeout(() => {
          pulseRef.current?.remove()
          pulseRef.current = null
        }, PULSE_LIFETIME_MS)
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied — enable it in your browser settings')
        } else {
          toast.error('Could not get your location')
        }
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    )
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      size="icon"
      variant="secondary"
      aria-label="Center on my location"
      title="Center on my location"
      onClick={handleLocate}
      disabled={locating}
      className="absolute bottom-8 right-3 z-[1000] h-9 w-9 rounded-full shadow-md"
    >
      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
    </Button>
  )
}
