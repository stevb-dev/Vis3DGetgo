import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * URL-safe slug for a location name (share links — sidebar-redesign ticket 04):
 * lowercase, keep Unicode letters/numbers (Cyrillic included), everything else
 * → hyphens, collapsed, trimmed. Cosmetic only — the share slug resolves on
 * coordinates, not the name.
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Full share URL for a location. The name is slugified + percent-encoded
 * (cosmetic); coordinates are the actual lookup key.
 */
export function buildShareUrl(name: string, latitude: number, longitude: number): string {
  const slug = encodeURIComponent(slugifyName(name) || 'location')
  return `${window.location.origin}/locations/${slug}/@${latitude.toFixed(5)},${longitude.toFixed(5)}`
}
