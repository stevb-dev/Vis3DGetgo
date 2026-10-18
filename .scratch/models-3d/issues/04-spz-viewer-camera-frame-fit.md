# 04: SPZ viewer — camera lands inside the model (frame-fit never runs)

Status: resolved
Feature: models-3d

## Context

Viewing a monument-scale `.spz` (admin upload `fae18f83-…spz`) puts the camera
too close to the origin point and *inside* the model. Root cause (confirmed at
PlayCanvas source level): `SplatViewer` frames the camera on
`gsplat.instance.meshInstance.aabb`, but the `gsplat` component is **unified by
default** and `instance` is `undefined` for unified components (the engine
renders them through the gsplat director/placement system). The AABB lookup
silently fails, so the fallback pose `(0, 0, 2.5)` runs — inside any splat
larger than ~2.5 m. The seed raccoon is small, which is why this shipped
through the (never-run) interactive browser pass.

The true bounds exist at parse time: `GSplatResourceBase` computes
`gsplatData.calcAabb(this.aabb)` → `asset.resource.aabb`, and the component's
`customAabb` getter falls through to it
(`_customAabb ?? _placement?.aabb ?? resource?.aabb`).

## Requirements

- [x] `SplatViewer` (frontend/src/components/ModelViewer.tsx): read the AABB
      from `gsplat.customAabb` (fallback `asset.resource.aabb`) instead of
      `gsplat.instance.meshInstance.aabb`.
- [x] Frame-fit with a true fit: distance from the camera fov + canvas aspect
      so the whole bounding sphere is visible (~10% margin), camera at ~18°
      elevation, `lookAt(center)`; `CameraControls` focusPoint gets the real
      center. Orbit-only behavior unchanged.
- [x] Keep the silent fixed fallback pose when no AABB exists (effectively
      dead code — the resource always computes one).

## Notes

- Grilling decisions (2026-10-18): fix the AABB source only (no framing
  rework beyond the fit math), true fit + slight elevation, silent fallback.
- If the engine typings don't expose `customAabb` on the gsplat component,
  declare it in `frontend/types/playcanvas-scripts.d.ts`.

## Comments

- 2026-10-18 (agent): Implemented. `SplatViewer` now frames on `gsplat?.customAabb ?? asset.resource.aabb` (the unified component's `instance` is undefined, so the old `instance.meshInstance.aabb` lookup always missed). A degenerate AABB counts as missing. The fit computes distance from the vertical fov vs the aspect-scaled horizontal half-angle (`radius / sin(min(half-angle)) * 1.1`) at 18° elevation. Typings needed no additions (`GSplatComponent.customAabb` is in the shipped engine d.ts). Verified by `tsc` + vite build; visual click-through (uploaded monument + seeded raccoon) pending.
- 2026-10-18 (agent, follow-up after first click-through): the true AABB over-framed by orders of magnitude — splat-data stats (splat-transform `computeStats`) showed the monument's positions saturate the SPZ 24-bit range (±2047, medians ~1–17: capture strays saturated by the v3→v4 conversion) and the raccoon's AABB is ~4× its core. Grilling decision: frame on **percentile-trimmed bounds** — `robustFrameBounds` strides the dequantized `resource.centers` (≤250k samples), sorts per axis, takes p0.1–p99.9. Falls back to `customAabb` → `resource.aabb` → fixed pose. Backend-side outlier filtering is a follow-up (ticket 05).
