import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Resolves a share-slug URL `/locations/<name>/@<lat>,<lng>` to the canonical
 * `/locations/:id` (the name is cosmetic; coordinates are the lookup key).
 * Redirects with a fly hint so the map centers on the resolved location.
 */
export default function SlugResolver() {
  const { coords } = useParams<{ coords: string }>()
  const navigate = useNavigate()

  // The `coords` segment is `@<lat>,<lng>` (the @ is cosmetic — see buildShareUrl).
  const raw = coords ?? ''
  const coordStr = raw.startsWith('@') ? raw.slice(1) : raw
  const [lat, lng] = coordStr.split(',')

  const { data, isError } = useQuery({
    queryKey: ['resolve', coords],
    queryFn: () =>
      api.get<{ id: number }>(`/locations/resolve?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
    enabled: !!lat && !!lng,
    retry: false,
  })

  useEffect(() => {
    if (data?.id) navigate(`/locations/${data.id}?fly=1`, { replace: true })
  }, [data, navigate])

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-muted-foreground">Location not found.</p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Back to the map
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
      Finding location…
    </div>
  )
}
