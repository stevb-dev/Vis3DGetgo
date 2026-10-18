# 02: Location detail split pane

Status: resolved
Feature: frontend-map

Blocked by: 03 (models-3d), 04 (images)

## Context

`/locations/:id` shows location info + 3D model + image carousel in a split-pane layout. Page is a placeholder; the viewer and carousel are tracked separately.

## Requirements

- [x] Layout: info panel (name, description, coords, creator) + 3D viewer + carousel (responsive split)
- [x] Data from `GET /api/locations/:id` (TanStack Query, key `['location', id]`)
- [x] Integrate `ModelViewer` (models-3d/03) and carousel (images/04)
- [x] Loading skeleton, 404 state, back-to-map navigation
- [x] Decide: side-by-side split on desktop, stacked on mobile

## Notes

- Both dependencies land before this ticket can be closed.
- The "side-by-side on desktop, stacked on mobile" decision was superseded by the
  ADR-0002 sidebar design: the detail pane lives next to the map at
  `/locations/:id` (nested route), not as a full page.

## Comments

- 2026-09-27 (agent): Partial — the info panel part of the split pane is implemented in `frontend/src/pages/LocationDetailPage.tsx` (name, description, coords, image count, created date, user-created vs seeded badge, back-to-map). The 3D viewer and carousel panes remain placeholder cards pending models-3d/03 and images/04.
- 2026-09-27 (agent, follow-up): Detail view refactored from a full page into a **sidebar** next to the map — `frontend/src/components/LocationSidebar.tsx`, nested under the map route (`/` with child `locations/:id`), so the map stays mounted and visible. Close button returns to the map. Still pending: 3D viewer (models-3d/03) and carousel (images/04) sections inside the sidebar.
- 2026-09-27 (grilling round): Closing affordances added — Escape key, empty-map click, and clicking the selected marker again (all navigate back to `/`).
- 2026-10-18 (agent): Closed out. The 3D viewer (`ModelControls` + `ModelViewerDialog`, models-3d/03) and carousel (images/04) sections had landed with their features; this pass added the remaining requirements — a pulse skeleton while loading and a distinct 404 state ("Location not found" + Back to map button, branched on `ApiError.status === 404`). The split-pane layout decision is recorded above as superseded by ADR-0002's sidebar. Verified by `tsc` + vite build.
