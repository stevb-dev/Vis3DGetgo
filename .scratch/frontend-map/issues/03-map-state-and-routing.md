# 03: Map state + routing sync

Status: ready-for-agent
Feature: frontend-map

Blocked by: 01 (frontend-map)

## Context

Selected location lives in Zustand and must stay in sync with the URL in both directions.

## Requirements

- [ ] Store: `selectedLocationId` (+ open/closed detail state) in a Zustand map store
- [ ] Marker click → store update + `navigate('/locations/:id')`
- [ ] Deep link / browser back → store syncs from the URL (param-driven)
- [ ] Closing the detail pane navigates back to `/` without a full reload
- [ ] Keep map viewport state in the store (or URL) so back-navigation restores the view

## Notes

- Single source of truth decision: prefer URL as the source of truth; store mirrors it.

## Comments

- 2026-09-27 (agent): Partial — URL is now the source of truth: `/locations/:id` is a nested route under the map page, the sidebar renders via `<Outlet />`, marker/popup clicks navigate, closing navigates back to `/`, and the map instance survives all of it (no remount, viewport kept). Map container resizes are handled by `MapSizeFix` (invalidateSize on route change). Remaining: persisting the viewport across full page reloads (URL query params), and the Zustand `selectedLocation` mirror if a store is still wanted.
