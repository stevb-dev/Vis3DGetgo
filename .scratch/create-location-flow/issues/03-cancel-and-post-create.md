# 03: Cancel + post-create navigation

Status: resolved
Feature: create-location-flow

Blocked by: 01

## Context

The flow needs an explicit cancel (there's none today beyond navigating away),
and the post-create navigation must keep the viewport rather than re-centering.

## Requirements

- [x] Cancel control in `CreateLocationPanel`: navigates to `/` (no selection),
      preserving `?category=` and `?layer=` (reuse `MapPage`'s `navigateMap`
      semantics) and the viewport.
- [x] Escape key cancels the flow with the same destination.
- [x] If name/description/category has changed from its default, cancel prompts
      "Discard this location?" before leaving; otherwise it exits immediately.
- [x] After a successful create, navigate to `/locations/:id` (the new location's
      sidebar opens) **without** `?fly=1` and without recentering — keep the
      current viewport. Preserve `?layer=` on that navigation.

## Notes

- No `?fly=1` on the post-create navigation is what keeps the map from flying;
  the map simply stays put and the new pin (selected) is already under the view.
- "Changed from default" = any of name non-empty, description non-empty, or
  category ≠ `MONUMENTS` (the form's initial value).

## Comments

- 2026-10-18 (agent): Implemented. Cancel = X button or the pre/post-pick Cancel buttons or Escape, all through the same `cancel()` — prompt "Discard this location?" when dirty (name/description non-empty or category ≠ MONUMENTS), otherwise exit immediately; a second Escape closes the prompt first. All exits go through `MapPage`'s `navigateMap('/')` (via `<Outlet context>`), preserving `?category=`, `?layer=` and the viewport. Post-create navigates via `navigateMap('/locations/:id')` — no `?fly=1`, no recenter, the map stays put and the new pin (selected) is already under the view. Verified by `tsc` + vite build; authenticated click-through pending.
