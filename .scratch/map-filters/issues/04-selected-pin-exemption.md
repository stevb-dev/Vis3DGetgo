# 04: Selected-pin + `?fly=1` exemption

Status: resolved
Feature: map-filters
Blocked by: 02, 03

## Context

The currently-selected location's marker — and any `?fly=1` external-entry target —
must always be visible, overriding both the category filter (02) and the zoom gate
(03). Otherwise an open location's pin would vanish while its sidebar is on screen,
or a share link would land on a hidden pin.

## Requirements

- [x] The selected marker (`selectedId`, from the `/locations/:id` route match) always renders, regardless of `?category=` or zoom.
- [x] The `?fly=1` target (the same location being flown to) is treated as selected for visibility during the fly, so it is never hidden.
- [x] External entry via share link (`/locations/:slug/@lat,lng` → `/locations/:id?fly=1`) still lands visibly: the fly-to zoom is 15 (> 12) and the pin is exempt, so arriving into a non-matching category works.
- [x] The `.marker-selected` recolor still applies to the selected marker as today.

## Notes

- Implement as the top of the visibility predicate: `isSelected(loc) || (…filter/gate…)` —
  see the spec's `visible(loc)` model.
- No change to `Recenter`'s fly behavior; this ticket only guarantees the marker renders.

## Comments

- 2026-10-13 (agent): Implemented. The predicate short-circuits on `loc.id === selectedId` first, so the selected marker (and any `?fly=1` target — same id) always renders regardless of filter/gate. `.marker-selected` recolor unchanged. Verified by `tsc` + vite build.
