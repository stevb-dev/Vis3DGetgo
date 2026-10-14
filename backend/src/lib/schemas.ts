import { z } from 'zod'

// Location taxonomy (.scratch/sidebar-redesign/issues/01). NATURE was added
// 2026-10-13 so natural sites like Matka Canyon are honestly labeled.
export const LOCATION_CATEGORIES = [
  'MUSEUMS',
  'ART_GALLERIES',
  'MONUMENTS',
  'EDUCATION',
  'ENTERTAINMENT',
  'HEALTH',
  'HOUSING',
  'STORES',
  'FINANCE',
  'FOOD_AND_DRINK',
  'NATURE',
] as const

export type LocationCategory = (typeof LOCATION_CATEGORIES)[number]

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional(),
  latitude: z.number({ message: 'Latitude is required' }).min(-90).max(90),
  longitude: z.number({ message: 'Longitude is required' }).min(-180).max(180),
  category: z.enum(LOCATION_CATEGORIES, { message: 'Category is required' }),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>

// Coordinates are deliberately NOT editable — editing moves nothing on the map.
// description may be null to clear it.
export const updateLocationSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long').optional(),
    description: z.string().trim().max(500, 'Description is too long').nullable().optional(),
    category: z.enum(LOCATION_CATEGORIES).optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined || v.category !== undefined, {
    message: 'Nothing to update',
  })

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Radius in meters; default 1000, capped at 50000.
  radius: z.coerce.number().min(1).max(50000).default(1000),
})

// Share-slug resolution: coords → nearest location (see sidebar-redesign/04).
export const resolveQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

// Semantic search (see search/05): trimmed, min 2 chars.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Query must be at least 2 characters').max(200),
})

// ── Images / reports ────────────────────────────────────────────────────────

export const REPORT_CATEGORIES = ['SPAM', 'INAPPROPRIATE', 'WRONG_LOCATION', 'BROKEN', 'OTHER'] as const

export const reportBodySchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
})

export type ReportBody = z.infer<typeof reportBodySchema>

// Report resolution (.scratch/report-resolution/02): two-action admin payload.
// DELETE soft-deletes the reported content; DISMISS closes the report untouched.
export const resolveReportSchema = z.object({
  action: z.enum(['DELETE', 'DISMISS']),
  note: z.string().trim().max(500, 'Note is too long').optional(),
})

// imageId: null clears the pin (thumbnail falls back to first-by-order).
export const thumbnailPatchSchema = z.object({
  imageId: z.number().int().positive().nullable(),
})
