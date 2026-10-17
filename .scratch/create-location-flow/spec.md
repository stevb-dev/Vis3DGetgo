# create-location-flow — spec

Rework the "New location" flow so the map viewport never resets when entering
or leaving it, and add an explicit way to cancel. Today `CreateLocationPage` is
a separate top-level route (`/locations/new`) with its own `MapContainer`, so
clicking "New location" unmounts the main map and mounts a fresh one centered at
geolocation-or-Skopje; after a successful create it navigates back to
`/locations/:id`, re-mounting the main map fresh again (a second reset). There
is also no way to cancel the flow except navigating away or reloading.

## Decisions (grilling round, 2026-10-15)

- **Architecture — nest under the map.** `/locations/new` becomes a nested route
  under `MapPage` (same pattern as the location sidebar), reusing the single live
  `MapContainer`. The map never unmounts, so the viewport (center + zoom) is
  preserved with zero jump. The route stays behind `ProtectedRoute` (guests are
  still redirected to login). Supersedes the separate `CreateLocationPage` map.
- **Create-mode map content.** While on `/locations/new`, hide the location
  markers, the search box, and the category chips (a clean canvas). Keep the tile
  switcher and the locate button. Empty-map clicks pick a spot.
- **Form placement — side panel.** The create flow renders as a right-side panel
  (like `LocationSidebar`) instead of the centered dialog. Entering
  `/locations/new` shows "Click the map to choose a spot" + a Cancel control;
  after a click a pin drops and the form (name / description / category +
  "Pinned at lat,lng") fills the panel. Re-clicking the map moves the pin (form
  values preserved).
- **After creation.** Navigate to `/locations/:id` (the new location's sidebar
  opens) but keep the current viewport — no recenter and no `?fly=1`.
- **Cancel.** An explicit Cancel button + the Escape key return to `/` (no
  selection), preserving the category filter, tile layer, and viewport — the
  same as closing the sidebar.
- **Cancel confirmation.** If name/description/category has changed from its
  default, prompt "Discard this location?" before leaving; otherwise cancel exits
  immediately.

## Gotchas (facts, not decisions)

- `useMatch('/locations/:id')` in `MapPage` also matches `/locations/new`
  (`id = "new"` → `Number("new") = NaN`). `MapPage` needs an explicit
  `isCreateMode = useMatch('/locations/new')` so it (a) hides markers/overlays
  and (b) doesn't treat "new" as a selected location. React Router's route
  ranking still renders the create panel over the dynamic route, but the
  `useMatch`-driven state must be guarded.
- `MapPage`'s empty-click handler (close sidebar) must be suppressed in create
  mode; the create panel's own click-catcher takes over picking.
- `CreateLocationPage`'s own `MapContainer`, `Recenter`, `useMapCenter`,
  `ClickCatcher`, `LocateButton`, `TileLayerController`, and `Dialog` all
  collapse away — the panel becomes an `<Outlet>` child on the live map.
  `MapPage`'s existing `Recenter`/`useMapCenter` stay as-is (initial center only).
- The Header "New location" link keeps navigating to `/locations/new` with
  `?layer=` passthrough; no center/zoom params are needed.

## Tickets

- `01-nest-route-preserve-viewport.md`
- `02-create-mode-map-and-panel.md`
- `03-cancel-and-post-create.md`
