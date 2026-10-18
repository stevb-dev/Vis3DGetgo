import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useMap } from 'react-leaflet'

/**
 * react-leaflet v4 applies MapContainer's center prop only on mount, so a
 * late-arriving position (geolocation) needs an explicit setView. When a
 * `flyTo` target is present (external entry via ?fly=1) it wins over the
 * initial center, so a slow geolocation resolve can't undo the fly.
 *
 * Once a fly has happened, clearing the target (marker click, sidebar close,
 * …) must NOT re-center: `navigateMap` deliberately drops the transient
 * `?fly=1`, and falling back to `setView(center)` there would yank the map
 * back to the mount-time center (geolocation home) instead of staying put.
 */
export function Recenter({
  center,
  flyTo,
}: {
  center: [number, number]
  flyTo?: [number, number] | null
}) {
  const map = useMap()
  const hasFlown = useRef(false)
  useEffect(() => {
    if (flyTo) {
      hasFlown.current = true
      map.flyTo(flyTo, 15, { duration: 0.8 })
    } else if (!hasFlown.current) {
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

/**
 * Keep the live viewport in the URL (`?lat=&lng=&zoom=`) so a full reload
 * restores the last view (ADR-0002: URL as the source of truth). Written on
 * move/zoom end with `replace` so panning doesn't spam the history; the
 * initial setView writes the starting viewport once, which is harmless.
 */
export function ViewportPersist() {
  const map = useMap()
  const [, setSearchParams] = useSearchParams()

  useEffect(() => {
    const write = () => {
      const c = map.getCenter()
      const z = map.getZoom()
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('lat', c.lat.toFixed(5))
          next.set('lng', c.lng.toFixed(5))
          next.set('zoom', z.toFixed(2))
          return next
        },
        { replace: true },
      )
    }
    map.on('moveend', write)
    map.on('zoomend', write)
    return () => {
      map.off('moveend', write)
      map.off('zoomend', write)
    }
  }, [map, setSearchParams])

  return null
}
