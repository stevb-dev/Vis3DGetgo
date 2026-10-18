import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { PickedSpot } from '@/pages/MapPage'
import { Location, LOCATION_CATEGORIES, LOCATION_CATEGORY_LABELS, LocationCategory } from '@/lib/types'
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

// Mirrors the backend's createLocationSchema.
const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional().or(z.literal('')),
  category: z.enum(LOCATION_CATEGORIES),
})

type FormValues = z.infer<typeof formSchema>

const DEFAULT_CATEGORY: LocationCategory = 'MONUMENTS'

/**
 * What the panel receives from MapPage via <Outlet context>. `picked` lives in
 * MapPage because the picked marker renders inside MapContainer while this
 * panel renders as an <Outlet> sibling outside it.
 */
interface CreatePanelContext {
  picked: PickedSpot | null
  setPicked: (picked: PickedSpot | null) => void
  setPickedCategory: (category: LocationCategory) => void
  navigateMap: (path: string) => void
}

/**
 * Create-location panel: right-side panel next to the live map (the create
 * route is nested under MapPage, so the map and its viewport survive). Before
 * a pick it prompts for a map click; after a pick it shows the form with the
 * pinned coordinates. Cancel (button or Escape) returns to `/` preserving the
 * category filter, tile layer and viewport.
 */
export default function CreateLocationPanel() {
  const { picked, setPickedCategory, navigateMap } = useOutletContext<CreatePanelContext>()
  const queryClient = useQueryClient()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', category: DEFAULT_CATEGORY },
  })

  // The picked pin renders on the map (inside MapContainer) with the category
  // pin matching the form's current category selection.
  const category = form.watch('category')
  useEffect(() => {
    setPickedCategory(category)
  }, [category, setPickedCategory])

  const { name, description } = form.watch()
  const dirty =
    name.trim() !== '' || (description ?? '').trim() !== '' || category !== DEFAULT_CATEGORY

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!picked) throw new Error('No position picked')
      return api.post<{ location: Location }>('/locations', {
        name: values.name,
        description: values.description || undefined,
        latitude: picked.lat,
        longitude: picked.lng,
        category: values.category,
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      // Open the new location's sidebar without ?fly=1 — the map (and its
      // viewport) stays put; the new selected pin is already under the view.
      navigateMap(`/locations/${res.location.id}`)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    },
  })

  function doCancel() {
    setConfirmOpen(false)
    navigateMap('/')
  }

  /** Cancel with a discard prompt when any form value changed from its default. */
  function cancel() {
    if (dirty) setConfirmOpen(true)
    else doCancel()
  }

  // Escape cancels the flow; a second Escape (while the discard prompt is
  // open) closes the prompt first. Deps are [confirmOpen, dirty] — cancel()
  // reads the current values through those.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (confirmOpen) setConfirmOpen(false)
      else cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOpen, dirty])

  return (
    <aside className="flex h-[calc(100vh-3.5rem)] w-96 shrink-0 flex-col overflow-y-auto border-l bg-card">
      <div className="sticky top-0 z-10 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">New location</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel"
            title="Cancel (Esc)"
            onClick={cancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!picked && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">Click the map to choose a spot</p>
          <Button variant="outline" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      )}

      {picked && (
        <div className="space-y-4 p-4">
          <p className="text-xs text-muted-foreground">
            Pinned at {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)} — click the map to move it
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="space-y-3"
              noValidate
            >
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Viewpoint over the city" {...field} />
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
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What makes this place interesting?" {...field} />
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
                <Button type="button" variant="outline" size="sm" onClick={cancel}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Creating…' : 'Create location'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this location?</DialogTitle>
            <DialogDescription>
              Your name, description and category will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={doCancel}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
