import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Dialog, DialogOverlay, DialogPortal, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ImageRecord, Location } from '@/lib/types'
import { cn } from '@/lib/utils'

const ZOOM_SCALE = 2
const DRAG_THRESHOLD_PX = 3

interface ImageLightboxProps {
  location: Location
  /** Already ordered by carousel order. */
  images: ImageRecord[]
  /** Index of the slide to open on; null = closed. */
  startIndex: number | null
  onClose: () => void
}

/**
 * Full-screen image viewer opened by LMB-clicking a carousel slide
 * (grilling decisions 2026-10-10): Radix Dialog shell reusing the embla
 * Carousel (swipe + arrows), transient state, caption only (counter +
 * location name), click-to-toggle zoom (fit ↔ 2× fit) with drag-to-pan,
 * navigation resets the zoom. Escape closes the lightbox only — the sidebar
 * gates its own Escape handler on this state.
 *
 * Gesture handling is plain React synthetic handlers on each slide — no
 * native listeners, no capture-phase tricks, no ref timing. While zoomed,
 * embla's drag watching is disabled via the `watchDrag` option (embla-react
 * reInits on options change and preserves the selected slide — verified in
 * its source: reActivate passes `selectedScrollSnap()` as the new
 * `startIndex`), so the slide handlers own the gesture: drag pans, a click
 * toggles the zoom.
 */
export default function ImageLightbox({ location, images, startIndex, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(startIndex ?? 0)
  const [zoomed, setZoomed] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [api, setApiState] = useState<CarouselApi | undefined>(undefined)

  const panRef = useRef({ x: 0, y: 0 })
  const gestureRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)

  const open = startIndex !== null

  function resetView() {
    panRef.current = { x: 0, y: 0 }
    setPan({ x: 0, y: 0 })
    setZoomed(false)
  }

  // Each open starts at the clicked slide, fitted.
  useEffect(() => {
    if (startIndex !== null) {
      setCurrent(startIndex)
      resetView()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex])

  // Track the visible slide; navigating resets zoom/pan.
  useEffect(() => {
    if (!api) return
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap())
      resetView()
    }
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  // Open at the clicked slide. Deliberately NOT the `startIndex` option:
  // embla-react reInits when options change (the zoom toggle flips
  // `watchDrag`), and reActivate merges the watched options OVER the
  // preserved scroll snap — a startIndex in opts would therefore jump the
  // carousel back to the originally-opened slide on every zoom toggle.
  // With no startIndex in opts, reInit keeps the current slide.
  useLayoutEffect(() => {
    if (open && api && startIndex !== null) {
      api.scrollTo(startIndex, false) // instant, before paint — no flash
    }
  }, [api, open, startIndex])

  function onSlidePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (zoomed) {
      // Own the gesture so drag-to-pan keeps receiving moves even off-slide.
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
    }
    gestureRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: panRef.current.x,
      py: panRef.current.y,
      moved: false,
    }
  }

  function onSlidePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gestureRef.current
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) g.moved = true
    if (!zoomed || !g.moved) return
    // Clamp so the zoomed image edges never leave the frame.
    const el = e.currentTarget
    const maxX = (el.offsetWidth * (ZOOM_SCALE - 1)) / 2
    const maxY = (el.offsetHeight * (ZOOM_SCALE - 1)) / 2
    const x = Math.min(maxX, Math.max(-maxX, g.px + dx))
    const y = Math.min(maxY, Math.max(-maxY, g.py + dy))
    panRef.current = { x, y }
    setPan({ x, y })
  }

  function onSlidePointerUp() {
    const g = gestureRef.current
    gestureRef.current = null
    if (g && !g.moved) {
      // Plain click/tap (no drag): toggle fit ↔ 2× fit.
      if (zoomed) resetView()
      else setZoomed(true)
    }
    setDragging(false)
  }

  function onSlidePointerCancel() {
    gestureRef.current = null
    setDragging(false)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" />
        <DialogPrimitive.Content className="fixed inset-0 z-[1001] flex flex-col items-center justify-center outline-none">
          <DialogTitle className="sr-only">Image viewer — {location.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Large view of the photos for {location.name}
          </DialogDescription>

          <DialogPrimitive.Close className="absolute right-4 top-4 z-20 rounded-full bg-white/10 p-2 text-white opacity-90 transition-opacity hover:bg-white/20 hover:opacity-100 focus:outline-none">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <Carousel
            className="w-full"
            setApi={setApiState}
            opts={{ align: 'center', watchDrag: !zoomed }}
          >
            <CarouselContent className="items-center">
              {images.map((image, index) => (
                <CarouselItem key={image.id} className="flex justify-center">
                  <div
                    onPointerDown={onSlidePointerDown}
                    onPointerMove={onSlidePointerMove}
                    onPointerUp={onSlidePointerUp}
                    onPointerCancel={onSlidePointerCancel}
                    className={cn(
                      'h-fit w-fit max-h-[85vh] max-w-[92vw] select-none',
                      zoomed ? 'cursor-grab' : 'cursor-zoom-in',
                      zoomed && dragging && 'cursor-grabbing',
                    )}
                    style={{ touchAction: zoomed ? 'none' : undefined }}
                  >
                    <img
                      src={image.filePath}
                      alt={`Photo ${index + 1} of ${location.name}`}
                      draggable={false}
                      className={cn(
                        'max-h-[85vh] max-w-[92vw] rounded-sm object-contain',
                        !dragging && 'transition-transform duration-200',
                      )}
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomed ? ZOOM_SCALE : 1})`,
                      }}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 h-10 w-10 border-white/20 bg-white/10 text-white hover:bg-white/20" />
            <CarouselNext className="right-4 h-10 w-10 border-white/20 bg-white/10 text-white hover:bg-white/20" />
          </Carousel>

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white">
            {current + 1} / {images.length} · {location.name}
          </p>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
