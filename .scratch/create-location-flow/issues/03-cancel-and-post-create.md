# 03: Cancel + post-create navigation

Status: ready-for-agent
Feature: create-location-flow

Blocked by: 01

## Context

The flow needs an explicit cancel (there's none today beyond navigating away),
and the post-create navigation must keep the viewport rather than re-centering.

## Requirements

- [ ] Cancel control in `CreateLocationPanel`: navigates to `/` (no selection),
      preserving `?category=` and `?layer=` (reuse `MapPage`'s `navigateMap`
      semantics) and the viewport.
- [ ] Escape key cancels the flow with the same destination.
- [ ] If name/description/category has changed from its default, cancel prompts
      "Discard this location?" before leaving; otherwise it exits immediately.
- [ ] After a successful create, navigate to `/locations/:id` (the new location's
      sidebar opens) **without** `?fly=1` and without recentering — keep the
      current viewport. Preserve `?layer=` on that navigation.

## Notes

- No `?fly=1` on the post-create navigation is what keeps the map from flying;
  the map simply stays put and the new pin (selected) is already under the view.
- "Changed from default" = any of name non-empty, description non-empty, or
  category ≠ `MONUMENTS` (the form's initial value).

## Comments
