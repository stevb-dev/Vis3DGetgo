# 01: Nest the create route under the map

Status: resolved
Feature: create-location-flow

## Context

Root cause of the viewport reset: `CreateLocationPage` is a separate top-level
route with its own `MapContainer`. Entering it unmounts the main map; leaving it
(after create) re-mounts the main map fresh. Nesting `/locations/new` under
`MapPage` reuses the single live map, so the viewport survives both directions
with no jump.

## Requirements

- [x] In `App.tsx`, move the create route under the map route: add
      `<Route path="locations/new" element={<CreateLocationPanel />} />` (wrapped
      in `ProtectedRoute` so guests are still redirected to login) as a child of
      the `/` route, removing the top-level `/locations/new` route. (The static
      segment `locations/new` ranks above the dynamic `locations/:id`, so the
      right component renders.)
- [x] Replace `pages/CreateLocationPage.tsx` with a `CreateLocationPanel`
      component rendered via the map's `<Outlet />` (no `MapContainer` of its own).
- [x] `MapPage`: add `isCreateMode = useMatch('/locations/new')`; when set, don't
      compute a selected id from the `:id` match (guard against `"new"` → `NaN`).
- [x] Keep `MapPage`'s `Recenter`/`useMapCenter` unchanged (initial center only).
- [x] Header "New location" link still navigates to `/locations/new`, preserving
      `?layer=` (no center/zoom params needed).

## Notes

- The map instance now survives create-mode entry/exit by construction; no
  viewport serialization is required.
- `isCreateMode` also drives the marker/overlay hiding (ticket 02) and the
  empty-click behaviour switch (ticket 02).

## Comments

- 2026-10-18 (agent): Implemented. `App.tsx` nests `locations/new` under the map route inside a `ProtectedRoute` layout route (guest redirect verified headlessly: `/locations/new` lands on `/login`); `pages/CreateLocationPage.tsx` deleted in favour of `components/CreateLocationPanel.tsx` rendered via `<Outlet context>`; `MapPage` guards `selectedId` with `isCreateMode` (`useMatch('/locations/new')`), swaps `MapClickHandler` for `CreateClickCatcher`, and resets the picked spot when leaving create mode. `Recenter`/`useMapCenter` untouched; the Header link was already carrying `?layer=` only. Verified by `tsc` + vite build + the null-island regression script; authenticated click-through pending.
