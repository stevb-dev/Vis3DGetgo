import { z } from 'zod'

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional(),
  latitude: z.number({ message: 'Latitude is required' }).min(-90).max(90),
  longitude: z.number({ message: 'Longitude is required' }).min(-180).max(180),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>

// Coordinates are deliberately NOT editable — editing moves nothing on the map.
// description may be null to clear it.
export const updateLocationSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long').optional(),
    description: z.string().trim().max(500, 'Description is too long').nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: 'Nothing to update',
  })

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Radius in meters; default 1000, capped at 50000.
  radius: z.coerce.number().min(1).max(50000).default(1000),
})
