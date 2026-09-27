import { useEffect, useState } from 'react'

/** Fallback city when geolocation is unavailable or denied. */
export const SKOPJE: [number, number] = [41.9973, 21.428]

/**
 * Initial map center: the user's position when the browser grants
 * geolocation (non-blocking, 5s timeout), otherwise Skopje.
 */
export function useMapCenter(): [number, number] {
  const [center, setCenter] = useState<[number, number]>(SKOPJE)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {
        // Denied / unavailable / timed out — stay on the fallback city.
      },
      { timeout: 5000, maximumAge: 300_000 },
    )
  }, [])

  return center
}
