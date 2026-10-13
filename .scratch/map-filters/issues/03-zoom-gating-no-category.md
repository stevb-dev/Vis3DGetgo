# 03: Zoom gating when no category is selected

Status: ready-for-agent
Feature: map-filters
Blocked by: 01

## Context

With no category active, the declutter rule is zoom-based: below zoom **12** the map
hides all markers; at/above 12 it shows everything. An empty map below 12 is accepted
(no floor, no hint). The selected pin is always kept (ticket 04).

## Requirements

- [ ] Read the live map zoom (react-leaflet `useMap` + `useMapEvents({ zoomend })`), tracked in component state so marker rendering reacts to zoom changes.
- [ ] When no `?category=` is set: at zoom < 12 render no markers; at zoom >= 12 render all markers.
- [ ] The selected location's marker is still rendered below 12 (ticket 04).
- [ ] Empty map below 12 with no filter is accepted as-is — no placeholder, no hint overlay.

## Notes

- Threshold `12` is a named constant (`ZOOM_GATE = 12`), easy to retune.
- react-leaflet's `MapContainer` `zoom` prop only applies on mount; the live zoom must
  come from the map instance, not the prop (same reason `Recenter` exists).
- Keep the existing loading/error overlays untouched.

## Comments
