import { useEffect, useRef, useState } from 'react'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TILE_LAYERS, getLayer, type TileLayerId } from '@/lib/tileLayers'

/**
 * Bottom-left layer switcher: a square showing the active layer's thumbnail.
 * Clicking opens a menu to the right; picking a layer selects it and closes.
 * Rendered as a sibling overlay of <MapContainer> (like CategoryFilter), so it
 * needs no Leaflet click-propagation guards.
 */
export default function TileLayerSwitcher({
  activeId,
  onSelect,
}: {
  activeId: TileLayerId
  onSelect: (id: TileLayerId) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click + Escape (only while open).
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const active = getLayer(activeId)

  return (
    <div ref={containerRef} className="absolute bottom-4 left-3 z-[1000] flex items-end gap-2">
      <button
        type="button"
        aria-label={`Change map style (current: ${active.label})`}
        title={`Current layer: ${active.label}`}
        onClick={() => setOpen((o) => !o)}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md shadow-md ring-2 ring-foreground/30"
      >
        <img src={active.thumbnail} alt="" aria-hidden className="h-full w-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-1 py-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <Layers className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium leading-none">Layers</span>
        </span>
      </button>

      {open && (
        <div className="flex gap-2 rounded-xl bg-background/90 p-2 shadow-md backdrop-blur-sm">
          {TILE_LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => {
                onSelect(layer.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-20 flex-col items-center gap-1 rounded-lg p-1',
                layer.id === activeId ? 'ring-2 ring-primary' : 'hover:bg-muted',
              )}
            >
              <img src={layer.thumbnail} alt={layer.label} className="h-16 w-16 rounded object-cover" />
              <span className="text-[11px] font-medium leading-tight">{layer.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
