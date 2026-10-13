import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, Marker, useMapEvents } from 'react-leaflet'
import { api, ApiError } from '@/lib/api'
import { defaultIcon } from '@/lib/leafletIcons'
import { useMapCenter } from '@/hooks/useMapCenter'
import { Recenter } from '@/components/mapEffects'
import LocateButton from '@/components/LocateButton'
import TileLayerController from '@/components/TileLayerController'
import { Location, LOCATION_CATEGORIES, LOCATION_CATEGORY_LABELS } from '@/lib/types'
import { DEFAULT_LAYER_ID, getLayer, isTileLayerId } from '@/lib/tileLayers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Picked {
  lat: number
  lng: number
}

function ClickCatcher({ onPick }: { onPick: (picked: Picked) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

export default function CreateLocationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const center = useMapCenter()
  const [searchParams] = useSearchParams()
  // Inherit the main map's active tile layer (tile-layers), default liberty.
  const rawLayer = searchParams.get('layer')
  const activeLayer = getLayer(isTileLayerId(rawLayer) ? rawLayer : DEFAULT_LAYER_ID)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', category: 'MONUMENTS' },
  })

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
      const layer = searchParams.get('layer')
      navigate(`/locations/${res.location.id}${layer ? `?layer=${layer}` : ''}`)
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    },
  })

  function handlePick(next: Picked) {
    setPicked(next)
    setError(null)
    setDialogOpen(true)
  }

  return (
    <div className="relative flex-1">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="relative h-[calc(100vh-3.5rem)] w-full">
        <TileLayerController layer={activeLayer} />
        <Recenter center={center} />
        <ClickCatcher onPick={handlePick} />
        <LocateButton />
        {picked && <Marker position={[picked.lat, picked.lng]} icon={defaultIcon} />}
      </MapContainer>

      <p className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-md bg-background/90 px-3 py-1.5 text-sm shadow">
        Click the map to choose a spot for your location
      </p>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New location</DialogTitle>
            <DialogDescription>
              {picked ? (
                <>
                  Pinned at {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                </>
              ) : (
                'No position selected'
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              className="space-y-4"
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Creating…' : 'Create location'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
