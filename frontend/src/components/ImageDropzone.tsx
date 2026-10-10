import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { ImagePlus, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Location } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_MB = 5
const MAX_FILES = 10
const ACCEPT = { 'image/jpeg': [], 'image/png': [], 'image/webp': [] }

/**
 * Drag-and-drop upload panel for a location's carousel (ticket 04).
 *
 * Grilling decision: the location creator may designate one file of the
 * INITIAL batch as the pinned thumbnail (0 existing images). Any later
 * thumbnail change is admin-only (via the carousel pin buttons).
 */
export default function ImageDropzone({ location }: { location: Location }) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const routeLocation = useLocation()

  const [files, setFiles] = useState<File[]>([])
  const [thumbIndex, setThumbIndex] = useState<number | null>(null)

  const mayPickThumbnail =
    location.images.length === 0 && user !== null && (user.role === 'ADMIN' || location.userId === user.id)

  const upload = useMutation({
    mutationFn: async (accepted: File[]) => {
      const formData = new FormData()
      accepted.forEach((file) => formData.append('images', file))
      if (thumbIndex !== null) formData.append('thumbnailIndex', String(thumbIndex))
      return api.post<{ images: unknown[] }>(`/locations/${location.id}/images`, formData)
    },
    onSuccess: () => {
      setFiles([])
      setThumbIndex(null)
      queryClient.invalidateQueries({ queryKey: ['location', String(location.id)] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(files.length === 1 ? 'Photo uploaded' : `${files.length} photos uploaded`)
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed')
    },
  })

  const onDrop = useMemo(
    () =>
      (accepted: File[], rejected: FileRejection[]) => {
        const combined = [...files, ...accepted]
        if (combined.length > MAX_FILES) {
          toast.error(`At most ${MAX_FILES} files per upload`)
          return
        }
        if (thumbIndex !== null && thumbIndex >= combined.length) setThumbIndex(null)
        setFiles(combined)
        if (rejected.length > 0) {
          const first = rejected[0].errors[0]
          toast.error(first.code === 'file-too-large' ? `File too large (max ${MAX_MB} MB)` : first.message)
        }
      },
    [files, thumbIndex],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
    maxFiles: MAX_FILES,
    maxSize: MAX_MB * 1024 * 1024,
    disabled: upload.isPending,
  })

  if (!user) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
        <Link
          to="/login"
          state={{ from: routeLocation.pathname }}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Log in
        </Link>{' '}
        to add photos.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-md border border-dashed p-4 text-center transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-1 text-xs text-muted-foreground">
          {isDragActive ? 'Drop the photos here' : 'Drag & drop photos, or click to browse'}
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          JPEG / PNG / WebP · up to {MAX_FILES} files · {MAX_MB} MB each
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
              {mayPickThumbnail && (
                <button
                  type="button"
                  title="Set as thumbnail"
                  aria-label={`Set ${file.name} as thumbnail`}
                  onClick={() => setThumbIndex(thumbIndex === index ? null : index)}
                  className={cn(
                    'rounded p-1 transition-colors',
                    thumbIndex === index ? 'bg-amber-500/20 text-amber-500' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Star className={cn('h-3.5 w-3.5', thumbIndex === index && 'fill-current')} />
                </button>
              )}
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setFiles(files.filter((_, i) => i !== index))
                  if (thumbIndex === index) setThumbIndex(null)
                  else if (thumbIndex !== null && thumbIndex > index) setThumbIndex(thumbIndex - 1)
                }}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {mayPickThumbnail && files.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          <Star className="mr-1 inline h-3 w-3" />
          This is the first upload — tap a star to make that photo the location thumbnail. Only the
          administrator can change it later.
        </p>
      )}

      <Button
        size="sm"
        className="w-full"
        disabled={files.length === 0 || upload.isPending}
        onClick={() => upload.mutate(files)}
      >
        {upload.isPending ? 'Uploading…' : `Upload ${files.length > 0 ? `${files.length} photo${files.length === 1 ? '' : 's'}` : ''}`}
      </Button>
    </div>
  )
}
