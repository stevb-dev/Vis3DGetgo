import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMap } from 'react-leaflet'

/**
 * react-leaflet v4 applies MapContainer's center prop only on mount, so a
 * late-arriving position (geolocation) needs an explicit setView. When a
 * `flyTo` target is present (external entry via ?fly=1) it wins over the
 * initial center, so a slow geolocation resolve can't undo the fly.
 */
export function Recenter({
  center,
  flyTo,
}: {
  center: [number, number]
  flyTo?: [number, number] | null
}) {
  const map = useMap()
  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 15, { duration: 0.8 })
    } else {
      map.setView(center)
    }
  }, [center, flyTo, map])
  return null
}

/**
 * Leaflet doesn't notice when its container resizes (the location sidebar
 * opening/closing). Re-run invalidateSize on route changes so tiles and
 * bounds stay correct.
 */
export function MapSizeFix() {
  const map = useMap()
  const location = useLocation()
  useEffect(() => {
    map.invalidateSize()
  }, [location.pathname, map])
  return null
}
