import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag, Pin, PinOff, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ImageRecord, Location, ReportCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import ReportDialog from '@/components/ReportDialog'
import ImageLightbox from '@/components/ImageLightbox'

interface ImageCarouselProps {
  location: Location
  /** Lightbox open index (lifted to the sidebar so Escape closes it first). */
  lightboxIndex: number | null
  onLightboxIndexChange: (index: number | null) => void
}

/**
 * Image carousel for the location sidebar (ticket 04). Per-slide actions:
 * - LMB on the photo opens the full-screen lightbox (ImageLightbox)
 * - delete (uploader or admin, confirm dialog)
 * - report (authenticated non-uploaders, category dialog)
 * - pin/unpin thumbnail (admin only — the creator's initial pick or the
 *   first-by-order fallback applies otherwise)
 */
export default function ImageCarousel({ location, lightboxIndex, onLightboxIndexChange }: ImageCarouselProps) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [deleteTarget, setDeleteTarget] = useState<ImageRecord | null>(null)
  const [reportTarget, setReportTarget] = useState<ImageRecord | null>(null)

  const images = useMemo(
    () => [...location.images].sort((a, b) => a.order - b.order),
    [location.images],
  )

  const isAdmin = user?.role === 'ADMIN'

  function invalidateLocation() {
    queryClient.invalidateQueries({ queryKey: ['location', String(location.id)] })
    queryClient.invalidateQueries({ queryKey: ['locations'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete<{ ok: boolean }>(`/images/${id}`),
    onSuccess: () => {
      setDeleteTarget(null)
      invalidateLocation()
      toast.success('Image deleted')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the image')
    },
  })

  const reportMutation = useMutation({
    mutationFn: ({ id, category }: { id: number; category: ReportCategory }) =>
      api.post<{ report: unknown }>(`/images/${id}/report`, { category }),
    onSuccess: () => {
      setReportTarget(null)
      toast.success('Reported — an administrator will review it')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not report the image')
    },
  })

  const pinMutation = useMutation({
    mutationFn: (imageId: number | null) =>
      api.patch<{ location: Location }>(`/locations/${location.id}/thumbnail`, { imageId }),
    onSuccess: (_data, imageId) => {
      invalidateLocation()
      toast.success(imageId === null ? 'Thumbnail reset to the first image' : 'Thumbnail updated')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not update the thumbnail')
    },
  })

  if (images.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        No photos yet.
      </p>
    )
  }

  return (
    <>
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => {
            const isPinned = location.thumbnailImageId === image.id
            const canDelete = user !== null && (isAdmin || image.userId === user.id)
            const canReport = user !== null && image.userId !== user.id
            return (
              <CarouselItem key={image.id} className="relative">
                <img
                  src={image.filePath}
                  alt={`Photo ${index + 1} of ${location.name}`}
                  loading="lazy"
                  title="View larger"
                  onClick={() => onLightboxIndexChange(index)}
                  className="h-48 w-full cursor-zoom-in rounded-md border object-cover"
                />
                {isPinned && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <Star className="h-3 w-3 fill-current" /> Thumbnail
                  </span>
                )}
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {isAdmin && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      title={isPinned ? 'Unpin thumbnail' : 'Set as thumbnail'}
                      aria-label={isPinned ? 'Unpin thumbnail' : 'Set as thumbnail'}
                      disabled={pinMutation.isPending}
                      onClick={() => pinMutation.mutate(isPinned ? null : image.id)}
                    >
                      {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  {canReport && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      title="Report this image"
                      aria-label="Report this image"
                      onClick={() => setReportTarget(image)}
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Delete image"
                      aria-label="Delete image"
                      onClick={() => setDeleteTarget(image)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  {index + 1} / {images.length}
                </span>
              </CarouselItem>
            )
          })}
        </CarouselContent>
        <CarouselPrevious className="left-1 z-10" />
        <CarouselNext className="right-1 z-10" />
      </Carousel>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this photo?</DialogTitle>
            <DialogDescription>
              The image is removed from the carousel and cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={reportTarget !== null}
        onOpenChange={(open) => !open && setReportTarget(null)}
        submitting={reportMutation.isPending}
        targetLabel={reportTarget ? `photo ${images.indexOf(reportTarget) + 1}` : ''}
        onSubmit={(category) => reportTarget && reportMutation.mutate({ id: reportTarget.id, category })}
      />

      <ImageLightbox
        location={location}
        images={images}
        startIndex={lightboxIndex}
        onClose={() => onLightboxIndexChange(null)}
      />
    </>
  )
}
