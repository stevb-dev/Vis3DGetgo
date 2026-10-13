import {
  Landmark,
  Palette,
  Castle,
  GraduationCap,
  Clapperboard,
  HeartPulse,
  Home,
  Store,
  Banknote,
  Utensils,
  Trees,
  type LucideIcon,
} from 'lucide-react'
import type { LocationCategory } from '@/lib/types'

/**
 * Icon per location category, used on the filter chips and in the sidebar
 * meta block. Kept beside the labels (`LOCATION_CATEGORY_LABELS` in types.ts)
 * so a category's icon and label stay in sync.
 */
export const LOCATION_CATEGORY_ICONS: Record<LocationCategory, LucideIcon> = {
  MUSEUMS: Landmark,
  ART_GALLERIES: Palette,
  MONUMENTS: Castle,
  EDUCATION: GraduationCap,
  ENTERTAINMENT: Clapperboard,
  HEALTH: HeartPulse,
  HOUSING: Home,
  STORES: Store,
  FINANCE: Banknote,
  FOOD_AND_DRINK: Utensils,
  NATURE: Trees,
}

/** Render a category's icon (small, inline). */
export function CategoryIcon({ category, className }: { category: LocationCategory; className?: string }) {
  const Icon = LOCATION_CATEGORY_ICONS[category]
  return <Icon className={className} />
}
