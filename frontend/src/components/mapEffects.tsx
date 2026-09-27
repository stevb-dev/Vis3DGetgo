import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useMap } from 'react-leaflet'

/**
 * react-leaflet v4 applies MapContainer's center prop only on mount, so a
 * late-arriving position (geolocation) needs an explicit setView.
 */
export function Recenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
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
