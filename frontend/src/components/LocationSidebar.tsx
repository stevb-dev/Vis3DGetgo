import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bookmark, Flag, Pencil, Share2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { LOCATION_CATEGORIES, LOCATION_CATEGORY_LABELS, Location, ReportCategory } from '@/lib/types'
import { cn, buildShareUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ImageDropzone from '@/components/ImageDropzone'
import ImageCarousel from '@/components/ImageCarousel'
import ReportDialog from '@/components/ReportDialog'

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional().or(z.literal('')),
  category: z.enum(LOCATION_CATEGORIES),
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

/** Description subtitle: 2-line clamp with a measured "Show more"/"Show less". */
function ClampedText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [text])

  return (
    <div className="min-w-0">
      <p ref={ref} className={cn('text-xs text-muted-foreground', !expanded && 'line-clamp-2')}>
        {text}
      </p>
      {overflowing && (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

/**
 * Side panel shown next to the map at /locations/:id (nested under the map
 * route, so the map stays mounted and visible).
 */
export default function LocationSidebar() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  // Lifted from the carousel so Escape can close the lightbox first.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const form = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { name: '', description: '', category: 'MONUMENTS' },
  })

  const reportMutation = useMutation({
    mutationFn: (category: ReportCategory) =>
      api.post<{ report: unknown }>(`/locations/${id}/report`, { category }),
    onSuccess: () => {
      setReportOpen(false)
      toast.success('Reported — an administrator will review it')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not report the location')
    },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['location', id],
    queryFn: () => api.get<{ location: Location }>(`/locations/${id}`),
    enabled: !!id,
    retry: false,
  })

  // Bookmark state is per-user, so it only fetches when logged in.
  const { data: savedData } = useQuery({
    queryKey: ['location', id, 'saved'],
    queryFn: () => api.get<{ saved: boolean }>(`/locations/${id}/save`),
    enabled: !!id && !!user,
  })
  const isSaved = savedData?.saved ?? false

  const saveMutation = useMutation({
    mutationFn: () => api.post<{ saved: boolean }>(`/locations/${id}/save`),
    onSuccess: (res) => {
      queryClient.setQueryData(['location', id, 'saved'], { saved: res.saved })
      queryClient.invalidateQueries({ queryKey: ['saved'] })
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not update bookmark')
    },
  })

  // Escape: close the lightbox first, then cancel editing, then the sidebar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (lightboxIndex !== null) {
        setLightboxIndex(null)
      } else if (editing) {
        setEditing(false)
      } else {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, editing, lightboxIndex])

  const loc = data?.location
  const permission = user && loc ? canModify(loc, user.id, user.role) : false

  function startEdit() {
    if (!loc) return
    form.reset({ name: loc.name, description: loc.description ?? '', category: loc.category })
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
        category: values.category,
      })
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['location', id] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location updated')
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  function handleSave() {
    if (!loc) return
    // Guests see the button; clicking prompts log-in (matches ImageDropzone).
    if (!user) {
      navigate('/login', { state: { from: routeLocation.pathname } })
      return
    }
    saveMutation.mutate()
  }

  async function handleShare() {
    if (!loc) return
    const url = buildShareUrl(loc.name, loc.latitude, loc.longitude)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy the link')
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
      <div className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{loc?.name ?? 'Location'}</h2>
            {loc && !editing && loc.description && <ClampedText text={loc.description} />}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {loc && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isSaved ? 'Unsave location' : 'Save location'}
                  title={isSaved ? 'Unsave' : 'Save'}
                  disabled={saveMutation.isPending}
                  onClick={handleSave}
                >
                  <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Share location"
                  title="Copy share link"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
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
            {user && loc && loc.userId !== user.id && !editing && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Report location"
                title="Report location"
                onClick={() => setReportOpen(true)}
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => navigate('/')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {LOCATION_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {LOCATION_CATEGORY_LABELS[cat]}
                            </option>
                          ))}
                        </Select>
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {LOCATION_CATEGORY_LABELS[loc.category]}
              </span>
            </div>
          )}

          <section>
            <h3 className="text-sm font-semibold">Images</h3>
            <div className="mt-2 space-y-3">
              <ImageCarousel
                location={loc}
                lightboxIndex={lightboxIndex}
                onLightboxIndexChange={setLightboxIndex}
              />
              <ImageDropzone location={loc} />
            </div>
          </section>

          {loc.model && (
            <section>
              <h3 className="text-sm font-semibold">3D model</h3>
              <div className="mt-2 flex min-h-[320px] items-center justify-center rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                Viewer — tracked ticket (.scratch/models-3d/issues/03-r3f-viewer-component.md)
              </div>
            </section>
          )}
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

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        submitting={reportMutation.isPending}
        targetLabel={loc?.name ?? 'location'}
        onSubmit={reportMutation.mutate}
      />
    </aside>
  )
}
