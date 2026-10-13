// API entity types — mirror backend/prisma/schema.prisma.

// Location taxonomy (.scratch/sidebar-redesign/issues/01).
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

export const LOCATION_CATEGORY_LABELS: Record<LocationCategory, string> = {
  MUSEUMS: 'Museums',
  ART_GALLERIES: 'Art Galleries',
  MONUMENTS: 'Monuments',
  EDUCATION: 'Education',
  ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health',
  HOUSING: 'Housing',
  STORES: 'Stores',
  FINANCE: 'Finance',
  FOOD_AND_DRINK: 'Food and Drink',
  NATURE: 'Nature',
}

/** Type guard for a `?category=` URL value (map-filters). */
export function isLocationCategory(value: string | null | undefined): value is LocationCategory {
  return (LOCATION_CATEGORIES as readonly string[]).includes(value as string)
}

export interface Model {
  id: number
  locationId: number
  filename: string
  filePath: string
  fileSize: number
  createdAt: string
}

export interface ImageRecord {
  id: number
  locationId: number
  userId: number
  filename: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  order: number
  createdAt: string
}

export interface Location {
  id: number
  name: string
  description: string | null
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
  userId: number | null
  /** Seeded demo locations (owned by the seed's demo admin account). */
  seeded: boolean
  /** Fixed category taxonomy (.scratch/sidebar-redesign/issues/01). */
  category: LocationCategory
  /** Admin-pinned carousel thumbnail; null → first image by order. */
  thumbnailImageId: number | null
  model: Model | null
  images: ImageRecord[]
}

/** Shape returned by GET /api/locations (list view). */
export interface LocationSummary {
  id: number
  name: string
  description: string | null
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
  userId: number | null
  seeded: boolean
  category: LocationCategory
  model: Model | null
  _count: { images: number }
  /** Pinned thumbnail, else first image by carousel order (null when none). */
  thumbnail: ImageRecord | null
}

// ── Reports ──────────────────────────────────────────────────────────────────

export const REPORT_CATEGORIES = ['SPAM', 'INAPPROPRIATE', 'WRONG_LOCATION', 'BROKEN', 'OTHER'] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  SPAM: 'Spam',
  INAPPROPRIATE: 'Inappropriate content',
  WRONG_LOCATION: 'Wrong location',
  BROKEN: 'Broken file',
  OTHER: 'Other',
}

export interface AdminReport {
  id: number
  category: ReportCategory
  status: 'OPEN' | 'RESOLVED'
  imageId: number | null
  locationId: number | null
  reporterId: number
  resolvedAt: string | null
  createdAt: string
  image: { id: number; filePath: string; locationId: number } | null
  location: { id: number; name: string } | null
  reporter: { id: number; username: string }
}
