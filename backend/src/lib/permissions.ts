export type Role = 'USER' | 'ADMIN'

export interface ModifiableLocation {
  userId: number | null
  model: unknown | null
  images: Array<{ userId: number }>
}

export interface Permission {
  allowed: boolean
  reason?: string
}

/**
 * Who may edit or delete a Location (grilling-round decision, 2026-09-27):
 * - ADMIN: any location, unrestricted.
 * - Owner (USER): only their own location, and only when a 3D model is NOT
 *   attached (models are attached by admins) and no image uploaded by another
 *   user exists. Images the owner uploaded themselves do not block.
 */
export function canModifyLocation(
  location: ModifiableLocation,
  userId: number | undefined,
  role: Role | undefined,
): Permission {
  if (role === 'ADMIN') return { allowed: true }
  if (location.userId !== userId) {
    return { allowed: false, reason: 'You can only modify your own locations' }
  }
  if (location.model) {
    return { allowed: false, reason: 'This location has a 3D model attached' }
  }
  const hasForeignImages = location.images.some((img) => img.userId !== userId)
  if (hasForeignImages) {
    return { allowed: false, reason: 'This location has images uploaded by other users' }
  }
  return { allowed: true }
}
