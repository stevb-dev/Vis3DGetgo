# 02: Create-mode map behaviour + side panel form

Status: ready-for-agent
Feature: create-location-flow

Blocked by: 01

## Context

With the create route nested under the map, the shared map needs a distinct
"create mode": markers/search/chips hidden, empty-map click picks a spot, and
the form lives in a right-side panel (replacing the centered dialog).

## Requirements

- [ ] `MapPage`: when `isCreateMode`, hide location markers, `SearchBox`, and
      `CategoryFilter` (keep `TileLayerSwitcher` and `LocateButton`); suppress
      the empty-click close-sidebar handler so clicks fall through to picking.
- [ ] `CreateLocationPanel`: right-side panel (like `LocationSidebar`).
  - Before a pick: show "Click the map to choose a spot" + a Cancel control.
  - After a pick: drop a marker at the picked coords and fill the panel with the
    form (name / description / category + "Pinned at lat,lng").
- [ ] Picking: a click catcher on the live map (via `useMapEvents`, as the old
      `ClickCatcher` did) sets the picked coords; re-clicking moves the marker
      while preserving any typed form values.
- [ ] Form uses react-hook-form + zod (unchanged schema), TanStack Query mutation
      → `POST /locations`, invalidates `['locations']`.

## Notes

- Keep the picked coords in panel-local state (transient, not URL state-of-truth
  — they aren't deep-linkable). The URL stays `/locations/new` with no coords.
- The tile layer continues to come from `?layer=`; the switcher stays visible so
  the user can change base layer while picking.

## Comments
