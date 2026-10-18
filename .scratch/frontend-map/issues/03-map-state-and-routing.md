# 03: Map state + routing sync

Status: resolved
Feature: frontend-map

Blocked by: 01 (frontend-map)

## Context

Selected location lives in Zustand and must stay in sync with the URL in both directions.

## Requirements

- [x] Store: `selectedLocationId` (+ open/closed detail state) in a Zustand map store — **wontfix**, see comments (URL-only; Zustand is auth-only in this app)
- [x] Marker click → store update + `navigate('/locations/:id')`
- [x] Deep link / browser back → store syncs from the URL (param-driven)
- [x] Closing the detail pane navigates back to `/` without a full reload
- [x] Keep map viewport state in the store (or URL) so back-navigation restores the view — implemented in the URL (`?lat=&lng=&zoom=`), not a store

## Notes

- Single source of truth decision: prefer URL as the source of truth; store mirrors it.

## Comments

- 2026-09-27 (agent): Partial — URL is now the source of truth: `/locations/:id` is a nested route under the map page, the sidebar renders via `<Outlet />`, marker/popup clicks navigate, closing navigates back to `/`, and the map instance survives all of it (no remount, viewport kept). Map container resizes are handled by `MapSizeFix` (invalidateSize on route change). Remaining: persisting the viewport across full page reloads (URL query params), and the Zustand `selectedLocation` mirror if a store is still wanted.
- 2026-10-18 (grilling round): Viewport persistence decided — flat `?lat=&lng=&zoom=` params, written on `moveend`/`zoomend` with `replace: true`, read once on mount to seed the map (URL viewport beats geolocation; `?fly=1` still beats the restored viewport). The Zustand mirror is **wontfix**: the app's only store is auth (`stores/auth.ts`) and nothing consumes a map store — the URL is the single source of truth, per ADR-0002.
- 2026-10-18 (agent): Implemented. `parseViewport` (validated, piece-wise fallback to geolocation/Skopje) seeds `MapContainer` center/zoom and `Recenter`'s center; `ViewportPersist` (mapEffects.tsx) writes the rounded viewport on move/zoom end via `setSearchParams(..., { replace: true })`, preserving `category`/`layer`; `navigateMap` carries the viewport params across marker-click navigation like the other params. Verified by `tsc` + vite build; manual browser pass pending.
- 2026-10-18 (agent, bugfix): Fresh loads rendered the map as open ocean — `Number(params.get('lat'))` turned an absent param into `0` (not `NaN`), so every param-less URL "restored" center `[0, 0]` (Gulf of Guinea) instead of the geolocation start. Fixed with `readNumberParam` (missing/empty/non-numeric → `null`). Reproduced + verified with a headless-Edge screenshot loop, now committed as `scripts/verify-map-render.ps1` (pixel-checks that a fresh `/` shows land, not liberty water). Root cause logged in `docs/implementation-status.md` §13.
