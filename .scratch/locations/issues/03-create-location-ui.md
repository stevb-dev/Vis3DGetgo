# 03: Create-location UI (map click → form)

Status: resolved
Feature: locations

Blocked by: 01 (frontend-map) — resolved

## Context

Users create locations by clicking the map (or long-press / button mode), naming it, and submitting. Backend `POST /api/locations` (locations/01).

## Requirements

- [ ] Map interaction: enter "add location" mode (toggle button, visible only when authenticated)
- [ ] Click sets lat/lng; form (shadcn/ui Dialog + Form) asks for name + optional description
- [ ] Submit via TanStack Query mutation; invalidate `['locations']`; show the new marker
- [ ] Unauthenticated users see a prompt to log in instead of the toggle
- [ ] Success → optionally navigate to the new location detail

## Notes

- Depends on the Leaflet map from `.scratch/frontend-map/issues/01-leaflet-map-with-markers.md`.

## Comments

- 2026-09-27 (agent): Implemented in `frontend/src/pages/CreateLocationPage.tsx` (unblocked by implementing frontend-map/01).
  - Map click (via `useMapEvents`) pins a marker and opens a Dialog with a name + optional description form (react-hook-form + zod, mirroring the backend schema).
  - Submit via TanStack Query mutation → invalidates `['locations']` → navigates to the new location's detail page.
  - The page sits behind `ProtectedRoute` (Header shows the "New location" link only when logged in).
- 2026-09-27 (bug fix): The create dialog rendered **behind the map** — Leaflet's container creates no stacking context, so its panes (z up to 1000) painted above the dialog's default z-50; the form was invisible and clicks passed through to the map. Fixed by raising the dialog overlay/content to z-[1000]/z-[1001] in `ui/dialog.tsx`. Also fixed the API client's 401-retry dropping `Content-Type` (would 400 after a successful silent refresh).
