import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Location, Model } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Client pre-check mirrors the backend's MAX_MODEL_MB default (50, env-tunable):
// it rejects obviously-bad files before uploading; the server enforces the real
// limit anyway. Same pattern as ImageDropzone's MAX_MB — keep in sync with the
// compose MAX_MODEL_MB if it changes.
const MAX_MODEL_MB = 50
const ALLOWED_EXTENSIONS = ['.glb', '.spz']

/**
 * Admin model management in the sidebar's "3D model" section (grilling
 * 2026-10-15): view (everyone) + delete (admin, with confirm) when a model
 * exists; upload (admin only) when there is none. Upload/delete hit the
 * admin-only `/models` endpoints; `onView` opens the viewer modal.
 */
export default function ModelControls({ location, onView }: { location: Location; onView: () => void }) {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const invalidateLocation = () => {
    queryClient.invalidateQueries({ queryKey: ['location', String(location.id)] })
    queryClient.invalidateQueries({ queryKey: ['locations'] })
  }

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('locationId', String(location.id))
      formData.append('file', file)
      return api.post<{ model: Model }>('/models', formData)
    },
    onSuccess: () => {
      invalidateLocation()
      toast.success('Model uploaded')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed')
    },
  })

  const remove = useMutation({
    mutationFn: () => {
      if (!location.model) throw new Error('No model to delete')
      return api.delete<{ ok: boolean }>(`/models/${location.model.id}`)
    },
    onSuccess: () => {
      setConfirmDelete(false)
      invalidateLocation()
      toast.success('Model removed')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove the model')
    },
  })

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so re-selecting the same file still fires a change event.
    e.target.value = ''
    if (!file) return
    const name = file.name.toLowerCase()
    if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      toast.error('Only .glb or .spz files are supported')
      return
    }
    if (file.size > MAX_MODEL_MB * 1024 * 1024) {
      toast.error(`File too large (max ${MAX_MODEL_MB} MB)`)
      return
    }
    upload.mutate(file)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.spz"
        className="hidden"
        onChange={onFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {location.model ? (
        <div className="mt-2 space-y-2">
          <Button variant="outline" className="w-full" onClick={onView}>
            View 3D model
            <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase">
              {location.model.format}
            </span>
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={remove.isPending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete model
            </Button>
          )}
        </div>
      ) : isAdmin ? (
        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Upload className="mr-1 h-4 w-4" />
          {upload.isPending ? 'Uploading…' : 'Upload model'}
        </Button>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={(open) => !remove.isPending && setConfirmDelete(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete 3D model?</DialogTitle>
            <DialogDescription>
              This permanently removes the model file from the server. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
