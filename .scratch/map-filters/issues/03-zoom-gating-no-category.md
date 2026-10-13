# 03: Zoom gating when no category is selected

Status: resolved
Feature: map-filters
Blocked by: 01

## Context

With no category active, the declutter rule is zoom-based: below zoom **12** the map
hides all markers; at/above 12 it shows everything. An empty map below 12 shows a
subtle non-interactive empty-state hint (no floor). The selected pin is always kept
(ticket 04).

## Requirements

- [x] Read the live map zoom (react-leaflet `useMap` + `useMapEvents({ zoomend })`), tracked in component state so marker rendering reacts to zoom changes.
- [x] When no `?category=` is set: at zoom < 12 render no markers; at zoom >= 12 render all markers.
- [x] The selected location's marker is still rendered below 12 (ticket 04).
- [x] Empty map below 12 with no filter shows a subtle non-interactive hint ("No locations here — pick a category or zoom in"); no floor.

## Notes

- Threshold `12` is a named constant (`ZOOM_GATE = 12`), easy to retune.
- react-leaflet's `MapContainer` `zoom` prop only applies on mount; the live zoom must
  come from the map instance, not the prop (same reason `Recenter` exists).
- Keep the existing loading/error overlays untouched.

## Comments

- 2026-10-13 (agent): Implemented. `ZoomTracker` reports the live zoom (on `zoomend`); `ZOOM_GATE = 12`; with no category the predicate renders markers only at `zoom >= 12`. Empty map below 12 shows a subtle non-interactive hint (no floor). Verified by `tsc` + vite build.
- 2026-10-13 (agent, grilling follow-up): the empty-state hint is pinned to the bottom of the map (was centered — too invasive).
