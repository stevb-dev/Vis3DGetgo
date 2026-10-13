# 04: Tile layer switcher

Status: resolved
Feature: tile-layers
Blocked by: 02, 05

## Context

The bottom-left control: a square showing the active layer's thumbnail. Clicking
it opens a menu to the right; picking a layer selects it and closes the menu.
The active layer lives in the URL (`?layer=<id>`), like the category filter.

## Requirements

- [ ] New `frontend/src/components/TileLayerSwitcher.tsx`, rendered as a sibling of `MapContainer` inside the `relative` wrapper in `MapPage` (so it anchors to the map area), `absolute bottom-* left-*` with `z-[1000]`.
- [ ] Active id comes from `?layer=` in `MapPage` via `useSearchParams` (default `liberty`; unknown values fall back to `liberty`). Pass `activeId` + `onSelect(id)` down; menu open/close is local state in the switcher.
- [ ] Trigger square shows `<img src={activeLayer.thumbnail}>` (accessible label). Click toggles the menu open/closed.
- [ ] Menu: a horizontal flex row to the right of the square — one square per layer (thumbnail + `label`), the active one visually marked. Clicking an item calls `onSelect(id)` and closes the menu.
- [ ] Close on outside click and Escape.
- [ ] `navigateMap` in `MapPage` preserves `?layer=` alongside `?category=` (still drops the transient `fly`).

## Notes

- No `L.DomEvent.disableClickPropagation` needed — the switcher is a sibling overlay (like `CategoryFilter`), not a child of `MapContainer`.
- The click-to-toggle (`topo ↔ last style`) interaction is dropped; there is no `lastOpenFreeMapId` bookkeeping.
- Menu is transient UI state (not in the URL); only the selected layer is `?layer=`.

## Comments

- 2026-10-13 (agent): Implemented `TileLayerSwitcher.tsx` (bottom-left, click-to-open menu to the right, outside-click/Escape closes). State via `?layer=` in `MapPage`; `navigateMap` preserves `?layer=` alongside `?category=`.
