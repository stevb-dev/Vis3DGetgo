# 02: Filter markers by selected category

Status: resolved
Feature: map-filters
Blocked by: 01

## Context

When a category is active (`?category=<value>`), the map shows only that category's
pins — at **all** zooms (the filter supersedes the zoom gating). The selected pin is
always kept (see ticket 04).

## Requirements

- [x] In `MapPage`, when `?category=` is a valid `LocationCategory`, render markers only for `loc.category === activeCategory`.
- [x] Applies at all zooms (no zoom threshold while a category is active).
- [x] The selected location's marker is still rendered even if its category does not match (defer the general rule to ticket 04; do not drop it here).
- [x] The hover tooltip (name + thumbnail) is unchanged for the markers that render.
- [x] Clearing the category returns to the no-filter behavior (ticket 03).

## Notes

- The filter runs over the already-fetched `['locations']` query — no refetch.
- With <20 locations a straightforward `.filter()` in the render loop is fine; no
  memoization framework is required.

## Comments

- 2026-10-13 (agent): Implemented as the `visibleLocations` predicate in `MapPage.tsx` — when `?category=` is valid, only `loc.category === activeCategory` markers render (selected pin exempt), at all zooms. Verified by `tsc` + vite build.
