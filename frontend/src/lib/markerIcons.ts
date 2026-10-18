import L from 'leaflet'
import type { LocationCategory } from '@/lib/types'

/**
 * Per-category marker pins. The pin is a CSS teardrop (`divIcon` + `.cat-pin`
 * in index.css) tinted with the category's hue and carrying the category's
 * lucide icon — the same icon as the filter chips (`lib/categoryIcons.tsx`).
 *
 * The inline SVGs below are snapshots of lucide-react v0.447.0 node data so a
 * divIcon can render them without the React tree or react-dom/server. They
 * share lucide's stroke style (fill=none, stroke=currentColor, width 2), and
 * the container colors the strokes white.
 */

/** Tailwind 500-series hue per category; `selected` is the 600-series. */
export const CATEGORY_COLORS: Record<LocationCategory, { base: string; selected: string }> = {
  MUSEUMS: { base: '#f59e0b', selected: '#d97706' }, // amber
  ART_GALLERIES: { base: '#d946ef', selected: '#c026d3' }, // fuchsia
  MONUMENTS: { base: '#78716c', selected: '#57534e' }, // stone
  EDUCATION: { base: '#3b82f6', selected: '#2563eb' }, // blue
  ENTERTAINMENT: { base: '#8b5cf6', selected: '#7c3aed' }, // violet
  HEALTH: { base: '#ef4444', selected: '#dc2626' }, // red
  HOUSING: { base: '#f97316', selected: '#ea580c' }, // orange
  STORES: { base: '#eab308', selected: '#ca8a04' }, // yellow
  FINANCE: { base: '#10b981', selected: '#059669' }, // emerald
  FOOD_AND_DRINK: { base: '#f43f5e', selected: '#e11d48' }, // rose
  NATURE: { base: '#22c55e', selected: '#16a34a' }, // green
}

const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'

/** Inner SVG markup per category (lucide v0.447.0, stroke-based). */
const CATEGORY_SVG: Record<LocationCategory, string> = {
  MUSEUMS: `${SVG_OPEN}<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  ART_GALLERIES: `${SVG_OPEN}<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  MONUMENTS: `${SVG_OPEN}<path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"/><path d="M18 11V4H6v7"/><path d="M15 22v-4a3 3 0 0 0-3-3a3 3 0 0 0-3 3v4"/><path d="M22 11V9"/><path d="M2 11V9"/><path d="M6 4V2"/><path d="M18 4V2"/><path d="M10 4V2"/><path d="M14 4V2"/></svg>`,
  EDUCATION: `${SVG_OPEN}<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`,
  ENTERTAINMENT: `${SVG_OPEN}<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`,
  HEALTH: `${SVG_OPEN}<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>`,
  HOUSING: `${SVG_OPEN}<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  STORES: `${SVG_OPEN}<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>`,
  FINANCE: `${SVG_OPEN}<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  FOOD_AND_DRINK: `${SVG_OPEN}<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  NATURE: `${SVG_OPEN}<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/></svg>`,
}

/** Cache one icon per (category, selected) — Leaflet clones by default but sharing is cheaper. */
const cache = new Map<string, L.DivIcon>()

/**
 * A colored category pin. Selected pins are a stronger shade, slightly larger,
 * and ringed — the anchor stays on the pin point so selection grows upward
 * without the marker drifting off its location.
 */
export function createCategoryIcon(category: LocationCategory, selected: boolean): L.DivIcon {
  const key = `${category}:${selected}`
  const hit = cache.get(key)
  if (hit) return hit

  const { base, selected: selectedColor } = CATEGORY_COLORS[category]
  const size = selected ? 34 : 30
  // A size×size square rotated 45° spans size·√2 — the container and the pin
  // point (bottom center of the rotated square) live on that grid, so the
  // anchor below puts the visual point exactly on the location.
  const container = Math.round(size * Math.SQRT2)
  const inset = (container - size) / 2

  const icon = L.divIcon({
    className: 'cat-pin-wrapper',
    html: `<div class="cat-pin${selected ? ' cat-pin--selected' : ''}" style="width:${container}px;height:${container}px">
      <div class="cat-pin__head" style="left:${inset}px;top:${inset}px;width:${size}px;height:${size}px;background-color:${selected ? selectedColor : base}">
        ${CATEGORY_SVG[category]}
      </div>
    </div>`,
    iconSize: [container, container],
    iconAnchor: [container / 2, container],
  })
  cache.set(key, icon)
  return icon
}
