import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { SearchResult } from '@/lib/types'

const DEBOUNCE_MS = 300
const MIN_CHARS = 2

/**
 * Semantic search box overlaid top-center (above the category chips). Debounced
 * type-ahead against GET /api/locations/search. Selecting a result flies the
 * map to the location and clears the active `?category=` filter (search is a
 * global discovery mode — see .scratch/search spec).
 */
export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const trimmed = debounced.trim()
  const enabled = trimmed.length >= MIN_CHARS

  const { data, isFetching } = useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => api.get<{ results: SearchResult[] }>(`/locations/search?q=${encodeURIComponent(trimmed)}`),
    enabled,
  })

  const results = data?.results ?? []

  function selectResult(id: number) {
    // Clear the category filter (global search), keep the base layer, fly in.
    const params = new URLSearchParams()
    params.set('fly', '1')
    const layer = searchParams.get('layer')
    if (layer) params.set('layer', layer)
    navigate(`/locations/${id}?${params.toString()}`)
    setQuery('')
    setDebounced('')
  }

  function clear() {
    setQuery('')
    setDebounced('')
  }

  return (
    <div className="absolute left-1/2 top-3 z-[1001] w-80 -translate-x-1/2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') clear()
          }}
          placeholder="Search locations…"
          className="h-9 w-full rounded-lg border bg-background/95 pl-8 pr-8 text-sm shadow-md backdrop-blur-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {enabled && (
        <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {!isFetching && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No matches</div>
          )}
          {!isFetching &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectResult(r.id)}
                className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
              >
                {r.thumbnail ? (
                  <img src={r.thumbnail.filePath} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-10 w-14 shrink-0 rounded bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  {r.description && (
                    <div className="truncate text-xs text-muted-foreground">{r.description}</div>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
