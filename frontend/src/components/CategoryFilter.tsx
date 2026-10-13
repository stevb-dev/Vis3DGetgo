import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LOCATION_CATEGORIES, LOCATION_CATEGORY_LABELS, isLocationCategory } from '@/lib/types'
import { CategoryIcon } from '@/lib/categoryIcons'

/** How far one arrow click scrolls the chip row (roughly 1–2 chips). */
const SCROLL_STEP = 160

/**
 * Category filter chips overlaid on the map (top-center). Single active
 * category, encoded in the URL as `?category=<value>` (ADR-0002 — URL is the
 * source of truth, so a filtered view is shareable and survives reload).
 * Tapping the active chip clears back to "no filter" (all locations).
 * Left/right arrows scroll the single row; each hides at its respective end.
 *
 * Rendered as a sibling overlay of <MapContainer>, so it sits above the map
 * without needing Leaflet's click-propagation guards.
 */
export default function CategoryFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('category')
  const active = isLocationCategory(raw) ? raw : null

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateArrows() {
    const el = scrollerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    updateArrows()
    window.addEventListener('resize', updateArrows)
    return () => window.removeEventListener('resize', updateArrows)
  }, [])

  function toggle(category: (typeof LOCATION_CATEGORIES)[number]) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (next.get('category') === category) next.delete('category')
        else next.set('category', category)
        return next
      },
      { replace: true },
    )
  }

  function scrollBy(dir: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' })
  }

  return (
    <div className="absolute left-1/2 top-3 z-[1000] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2">
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll categories left"
            onClick={() => scrollBy(-1)}
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-0.5 shadow hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-xl bg-background/85 p-1.5 shadow-md backdrop-blur-sm"
        >
          {LOCATION_CATEGORIES.map((category) => {
            const isActive = category === active
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isActive}
                onClick={() => toggle(category)}
                className={cn(
                  'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <CategoryIcon category={category} className="h-3.5 w-3.5" />
                {LOCATION_CATEGORY_LABELS[category]}
              </button>
            )
          })}
        </div>
        {canScrollRight && (
          <button
            type="button"
            aria-label="Scroll categories right"
            onClick={() => scrollBy(1)}
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-0.5 shadow hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
