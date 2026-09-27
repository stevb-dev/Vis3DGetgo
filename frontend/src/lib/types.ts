// API entity types — mirror backend/prisma/schema.prisma.

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
  model: Model | null
  _count: { images: number }
  /** First image by carousel order (null when the location has none). */
  thumbnail: ImageRecord | null
}
