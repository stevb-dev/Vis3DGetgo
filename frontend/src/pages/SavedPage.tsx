import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookmarkX, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { LOCATION_CATEGORY_LABELS, LocationSummary } from '@/lib/types'
import { buildShareUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BackToMapButton from '@/components/BackToMapButton'

export default function SavedPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['saved'],
    queryFn: () => api.get<{ locations: LocationSummary[] }>('/saved/locations'),
  })

  const unsave = useMutation({
    mutationFn: (id: number) => api.post<{ saved: boolean }>(`/locations/${id}/save`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not unsave'),
  })

  function copyShareUrl(loc: LocationSummary) {
    navigator.clipboard
      .writeText(buildShareUrl(loc.name, loc.latitude, loc.longitude))
      .then(
        () => toast.success('Link copied to clipboard'),
        () => toast.error('Could not copy the link'),
      )
  }

  const locations = data?.locations ?? []

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <BackToMapButton className="shrink-0" />
        <h1 className="text-lg font-semibold">Saved locations</h1>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && <p className="text-sm text-destructive">Failed to load saved locations</p>}

      {!isLoading && !isError && locations.length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing saved yet. Open a location and tap the bookmark to save it.
        </div>
      )}

      {locations.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <li key={loc.id}>
              <Card className="flex flex-col overflow-hidden">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => navigate(`/locations/${loc.id}?fly=1`)}
                >
                  {loc.thumbnail ? (
                    <img src={loc.thumbnail.filePath} alt={loc.name} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <CardContent className="space-y-1 p-3">
                    <p className="truncate font-medium">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">{LOCATION_CATEGORY_LABELS[loc.category]}</p>
                  </CardContent>
                </button>
                <div className="mt-auto flex gap-2 px-3 pb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyShareUrl(loc)}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={unsave.isPending}
                    onClick={() => unsave.mutate(loc.id)}
                  >
                    <BookmarkX className="h-4 w-4" />
                    Unsave
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
