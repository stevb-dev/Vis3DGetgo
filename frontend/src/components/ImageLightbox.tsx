import { useEffect, useRef, useState } from 'react'
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
 */
export default function ImageLightbox({ location, images, startIndex, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(startIndex ?? 0)
  const [zoomed, setZoomed] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [api, setApiState] = useState<CarouselApi | undefined>(undefined)

  const panRef = useRef({ x: 0, y: 0 })
  const slideRef = useRef<HTMLDivElement | null>(null)

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

  // Native pointer handling on the visible slide. When zoomed we must block
  // the pointerdown BEFORE it reaches embla's own native listeners (which sit
  // below React's root, so a synthetic stopPropagation is too late) and then
  // implement drag-to-pan ourselves. The zoom toggle lives entirely in
  // pointerup: a React onClick would fire right after an unzoom click's
  // re-render with the NEW (fitted) closure and immediately re-zoom.
  //
  // NOTE: `open` is a dependency. The component stays mounted while closed
  // (renders null), and `current` is initialized to 0 — opening at index 0
  // leaves `[current, zoomed]` unchanged, so without `open` the listeners
  // early-returned while closed would never be attached (thumbnail=photo #1
  // wouldn't zoom until navigating away and back).
  useEffect(() => {
    const el = slideRef.current
    if (!el) return

    let start: { x: number; y: number; px: number; py: number } | null = null
    let moved = false

    const onDown = (e: PointerEvent) => {
      if (zoomed) {
        e.stopPropagation()
        el.setPointerCapture(e.pointerId)
        setDragging(true)
      }
      start = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y }
      moved = false
    }
    const onMove = (e: PointerEvent) => {
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) moved = true
      if (!zoomed || !moved) return
      // Clamp so the zoomed image edges never leave the frame.
      const maxX = (el.offsetWidth * (ZOOM_SCALE - 1)) / 2
      const maxY = (el.offsetHeight * (ZOOM_SCALE - 1)) / 2
      const x = Math.min(maxX, Math.max(-maxX, start.px + dx))
      const y = Math.min(maxY, Math.max(-maxY, start.py + dy))
      panRef.current = { x, y }
      setPan({ x, y })
    }
    const onUp = () => {
      if (start && !moved) {
        // Plain click/tap (no drag): toggle fit ↔ 2× fit.
        if (zoomed) resetView()
        else setZoomed(true)
      }
      start = null
      setDragging(false)
    }
    const onCancel = () => {
      start = null
      setDragging(false)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
    }
  }, [current, zoomed, open])

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
            opts={{ startIndex: startIndex ?? 0, align: 'center' }}
          >
            <CarouselContent className="items-center">
              {images.map((image, index) => (
                <CarouselItem key={image.id} className="flex justify-center">
                  <div
                    ref={index === current ? slideRef : undefined}
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
