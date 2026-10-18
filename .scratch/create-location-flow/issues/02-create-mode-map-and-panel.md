# 02: Create-mode map behaviour + side panel form

Status: resolved
Feature: create-location-flow

Blocked by: 01

## Context

With the create route nested under the map, the shared map needs a distinct
"create mode": markers/search/chips hidden, empty-map click picks a spot, and
the form lives in a right-side panel (replacing the centered dialog).

## Requirements

- [x] `MapPage`: when `isCreateMode`, hide location markers, `SearchBox`, and
      `CategoryFilter` (keep `TileLayerSwitcher` and `LocateButton`); suppress
      the empty-click close-sidebar handler so clicks fall through to picking.
- [x] `CreateLocationPanel`: right-side panel (like `LocationSidebar`).
  - Before a pick: show "Click the map to choose a spot" + a Cancel control.
  - After a pick: drop a marker at the picked coords and fill the panel with the
    form (name / description / category + "Pinned at lat,lng").
- [x] Picking: a click catcher on the live map (via `useMapEvents`, as the old
      `ClickCatcher` did) sets the picked coords; re-clicking moves the marker
      while preserving any typed form values.
- [x] Form uses react-hook-form + zod (unchanged schema), TanStack Query mutation
      → `POST /locations`, invalidates `['locations']`.

## Notes

- Keep the picked coords in panel-local state (transient, not URL state-of-truth
  — they aren't deep-linkable). The URL stays `/locations/new` with no coords.
- The tile layer continues to come from `?layer=`; the switcher stays visible so
  the user can change base layer while picking.

## Comments

- 2026-10-18 (agent): Implemented, with one deliberate deviation from the Notes: the picked spot is **not** panel-local state — the panel renders as an `<Outlet>` sibling outside `MapContainer`, so `useMapEvents`/markers can't live in the panel. `MapPage` owns the transient `picked` state and shares it through `<Outlet context>`; `CreateClickCatcher` (inside `MapContainer`) picks and the picked marker renders beside the location markers. Same transient, not-in-URL semantics.
- 2026-10-18 (grilling): the picked pin is the **category pin following the form's category selection** (selected-style, ringed), recoloring live as the dropdown changes.
- 2026-10-18 (agent): Verified by `tsc` + vite build; authenticated click-through pending.
