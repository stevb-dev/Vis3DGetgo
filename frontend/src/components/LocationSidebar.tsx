import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { Location } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional().or(z.literal('')),
})

type UpdateValues = z.infer<typeof updateSchema>

/**
 * Mirrors the server rule (backend/src/lib/permissions.ts) for UI visibility.
 * The server enforces the rule regardless — this only hides the buttons.
 */
function canModify(loc: Location, userId: number, role: 'USER' | 'ADMIN'): boolean {
  if (role === 'ADMIN') return true
  if (loc.userId !== userId) return false
  if (loc.model) return false
  return loc.images.every((img) => img.userId === userId)
}

/**
 * Side panel shown next to the map at /locations/:id (nested under the map
 * route, so the map stays mounted and visible).
 */
export default function LocationSidebar() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const form = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { name: '', description: '' },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['location', id],
    queryFn: () => api.get<{ location: Location }>(`/locations/${id}`),
    enabled: !!id,
    retry: false,
  })

  // Escape: cancel editing first, otherwise close the sidebar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (editing) setEditing(false)
      else navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, editing])

  const loc = data?.location
  const permission = user && loc ? canModify(loc, user.id, user.role) : false

  function startEdit() {
    if (!loc) return
    form.reset({ name: loc.name, description: loc.description ?? '' })
    setEditError(null)
    setEditing(true)
  }

  async function saveEdit(values: UpdateValues) {
    if (!loc) return
    setEditError(null)
    try {
      await api.patch<{ location: Location }>(`/locations/${loc.id}`, {
        name: values.name,
        description: values.description || null,
      })
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['location', id] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location updated')
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  async function confirmDelete() {
    if (!loc) return
    setDeleting(true)
    try {
      await api.delete<{ ok: boolean }>(`/locations/${loc.id}`)
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      navigate('/')
      toast.success('Location deleted')
    } catch (err) {
      setDeleting(false)
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the location')
    }
  }

  return (
    <aside className="flex h-[calc(100vh-3.5rem)] w-96 shrink-0 flex-col overflow-y-auto border-l bg-card">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <h2 className="truncate text-sm font-semibold">{loc?.name ?? 'Location'}</h2>
        <div className="flex items-center gap-1">
          {permission && !editing && (
            <>
              <Button variant="ghost" size="icon" aria-label="Edit location" title="Edit location" onClick={startEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete location"
                title="Delete location"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" aria-label="Close" onClick={() => navigate('/')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}

      {isError && (
        <div className="p-4 text-sm text-muted-foreground">
          {error instanceof ApiError ? error.message : 'Location not found'}
        </div>
      )}

      {loc && (
        <div className="space-y-5 p-4">
          <div className="space-y-1 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {loc.userId ? 'User-created location' : 'Pre-seeded demo location'}
            </p>

            {editing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(saveEdit)} className="space-y-3" noValidate>
                  {editError && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                      {editError}
                    </p>
                  )}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <>
                {loc.description && <p>{loc.description}</p>}
                <p className="text-muted-foreground">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(loc.createdAt).toLocaleString()}
                  {loc.updatedAt !== loc.createdAt &&
                    ` · Updated ${new Date(loc.updatedAt).toLocaleString()}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loc.images.length} image{loc.images.length === 1 ? '' : 's'}
                </p>
              </>
            )}
          </div>

          <section>
            <h3 className="text-sm font-semibold">3D model</h3>
            <div className="mt-2 flex min-h-48 items-center justify-center rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Viewer — tracked ticket (.scratch/models-3d/issues/03-r3f-viewer-component.md)
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Images</h3>
            <div className="mt-2 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Upload + carousel — tracked ticket (.scratch/images/issues/04-upload-ui-carousel.md)
            </div>
          </section>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{loc?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This permanently removes the location{loc?.model || loc?.images.length ? ' and its attached model/images' : ''}. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
