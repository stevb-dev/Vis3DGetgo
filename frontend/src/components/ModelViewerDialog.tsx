import { Suspense, lazy } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Dialog, DialogOverlay, DialogPortal, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Model } from '@/lib/types'

// Lazy-load the viewer so three/drei and the Gaussian-splat library only
// download when the modal is first opened (off the critical path).
const ModelViewer = lazy(() => import('@/components/ModelViewer'))

interface ModelViewerDialogProps {
  model: Model | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Large modal hosting the 3D viewer (grilling decisions 2026-10-14):
 * modal-only presentation — the sidebar shows a trigger button, the viewer
 * renders here. Escape closes the modal only: `onEscapeKeyDown` prevents
 * Radix's auto-dismiss and `onKeyDown` closes + stopPropagation so the
 * sidebar's window-level Escape handler never sees the event (same fix as the
 * lightbox — see the bug ledger).
 */
export default function ModelViewerDialog({ model, open, onOpenChange }: ModelViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[1001] h-[85vh] w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-background outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return
            e.stopPropagation()
            onOpenChange(false)
          }}
        >
          <DialogTitle className="sr-only">3D model — {model?.format ?? ''}</DialogTitle>
          <DialogDescription className="sr-only">Interactive 3D model viewer</DialogDescription>

          <DialogPrimitive.Close className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-2 text-white opacity-90 transition-opacity hover:bg-black/70 hover:opacity-100 focus:outline-none">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {open && model && (
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                    role="status"
                    aria-label="Loading 3D viewer"
                  />
                </div>
              }
            >
              <ModelViewer model={model} />
            </Suspense>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
