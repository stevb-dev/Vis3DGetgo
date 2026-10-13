# 06: Search box overlay + dropdown + fly-to

Status: resolved
Feature: search
Blocked by: 05

## Context

A search input overlaid on the map; type-ahead dropdown of ranked results; selecting one flies the map to the marker and opens the `/locations/:id` sidebar. Must respect the map UX conventions (overlays need `z-index > 1000`; marker click opens the sidebar; URL is the source of truth).

## Requirements

- [ ] `SearchBox` component overlaid on the map — top-center, stacked above the category filter chips (`z-index > 1000`).
- [ ] Debounced query (300ms) to `GET /api/locations/search?q=` via TanStack Query; only fire at ≥ 2 chars.
- [ ] Dropdown lists up to 8 results: thumbnail, name, description snippet (render like the marker tooltip).
- [ ] "No matches" state when the response is empty; loading indicator; clearable input (Esc / X).
- [ ] Selecting a result: fly the map to the marker, navigate to `/locations/:id`, and clear the active `?category=` filter (search is global — see spec, 2026-10-13 round).
- [ ] Keyboard nav optional (↑/↓ + Enter), not required.

## Notes

- Reuse the existing fly-to mechanism (the Locate button already flies; share or mirror it).
- The search result thumbnail should match what the tooltip shows — same `thumbnail` field from the endpoint.

## Comments

- 2026-10-14 (agent): Implemented. `SearchBox` component top-center above the category chips; 300ms debounce, ≥2 chars; select → fly + clear `?category=` (keep `?layer=`). Build-verified; pending browser pass.
