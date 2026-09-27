# 04: Locate-me button

Status: resolved
Feature: frontend-map

## Context

Decision from a grilling round (user answers via questionnaire): a bottom-right button that centers the map on the user's current location.

## Requirements

- [x] One-shot recenter: `getCurrentPosition()` on every click (5s timeout, high accuracy), `flyTo` with 0.8s duration, zoom raised to `max(currentZoom, 15)`
- [x] Temporary pulsing "you are here" dot at the position (removed after 5s)
- [x] Spinner on the button while locating
- [x] Failures (denied / timeout / unsupported) → sonner toast (sonner added as a dependency)
- [x] Both pages: main map and create-location map
- [x] Bottom-right, floating above the Leaflet attribution; button clicks/scroll don't leak to the map (`L.DomEvent.disableClickPropagation/ScrollPropagation`)
- [x] z-index above Leaflet panes; `relative` on the map container so the button anchors to the map area (not the sidebar row)

## Comments

- 2026-09-27 (agent): Implemented — `frontend/src/components/LocateButton.tsx`, `frontend/src/components/ui/sonner.tsx`, pulse CSS in `index.css`. Verified: `tsc && vite build` clean, container rebuilt.