# 02: Location detail split pane

Status: ready-for-agent
Feature: frontend-map

Blocked by: 03 (models-3d), 04 (images)

## Context

`/locations/:id` shows location info + 3D model + image carousel in a split-pane layout. Page is a placeholder; the viewer and carousel are tracked separately.

## Requirements

- [ ] Layout: info panel (name, description, coords, creator) + 3D viewer + carousel (responsive split)
- [ ] Data from `GET /api/locations/:id` (TanStack Query, key `['location', id]`)
- [ ] Integrate `ModelViewer` (models-3d/03) and carousel (images/04)
- [ ] Loading skeleton, 404 state, back-to-map navigation
- [ ] Decide: side-by-side split on desktop, stacked on mobile

## Notes

- Both dependencies land before this ticket can be closed.

## Comments

- 2026-09-27 (agent): Partial — the info panel part of the split pane is implemented in `frontend/src/pages/LocationDetailPage.tsx` (name, description, coords, image count, created date, user-created vs seeded badge, back-to-map). The 3D viewer and carousel panes remain placeholder cards pending models-3d/03 and images/04.
- 2026-09-27 (agent, follow-up): Detail view refactored from a full page into a **sidebar** next to the map — `frontend/src/components/LocationSidebar.tsx`, nested under the map route (`/` with child `locations/:id`), so the map stays mounted and visible. Close button returns to the map. Still pending: 3D viewer (models-3d/03) and carousel (images/04) sections inside the sidebar.
- 2026-09-27 (grilling round): Closing affordances added — Escape key, empty-map click, and clicking the selected marker again (all navigate back to `/`).
