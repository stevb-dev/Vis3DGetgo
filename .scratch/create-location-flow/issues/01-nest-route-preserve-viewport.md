# 01: Nest the create route under the map

Status: ready-for-agent
Feature: create-location-flow

## Context

Root cause of the viewport reset: `CreateLocationPage` is a separate top-level
route with its own `MapContainer`. Entering it unmounts the main map; leaving it
(after create) re-mounts the main map fresh. Nesting `/locations/new` under
`MapPage` reuses the single live map, so the viewport survives both directions
with no jump.

## Requirements

- [ ] In `App.tsx`, move the create route under the map route: add
      `<Route path="locations/new" element={<CreateLocationPanel />} />` (wrapped
      in `ProtectedRoute` so guests are still redirected to login) as a child of
      the `/` route, removing the top-level `/locations/new` route. (The static
      segment `locations/new` ranks above the dynamic `locations/:id`, so the
      right component renders.)
- [ ] Replace `pages/CreateLocationPage.tsx` with a `CreateLocationPanel`
      component rendered via the map's `<Outlet />` (no `MapContainer` of its own).
- [ ] `MapPage`: add `isCreateMode = useMatch('/locations/new')`; when set, don't
      compute a selected id from the `:id` match (guard against `"new"` → `NaN`).
- [ ] Keep `MapPage`'s `Recenter`/`useMapCenter` unchanged (initial center only).
- [ ] Header "New location" link still navigates to `/locations/new`, preserving
      `?layer=` (no center/zoom params needed).

## Notes

- The map instance now survives create-mode entry/exit by construction; no
  viewport serialization is required.
- `isCreateMode` also drives the marker/overlay hiding (ticket 02) and the
  empty-click behaviour switch (ticket 02).

## Comments
