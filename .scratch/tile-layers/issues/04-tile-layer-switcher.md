# 04: Tile layer switcher

Status: ready-for-agent
Feature: tile-layers
Blocked by: 02, 05

## Context

The bottom-left control. One always-visible square (shows the active layer's
thumbnail) that both toggles on click and reveals a hover menu of all layers.

## Requirements

- [ ] New `frontend/src/components/TileLayerSwitcher.tsx`, rendered as a sibling of `MapContainer` inside the `relative` wrapper in `MapPage` (so it anchors to the map area), `absolute bottom-* left-*` with `z-[1000]`.
- [ ] State lives in `MapPage`: `activeId` + `lastOpenFreeMapId` (default `liberty`). Pass `activeId`, `onSelect(id)`, and `onToggle()` down.
- [ ] Trigger square shows `<img src={activeLayer.thumbnail}>` (the active layer's thumbnail) with an accessible label.
- [ ] Hover menu: a flex row to the right of the square — one square div per layer (thumbnail + type `label` beneath), the active one visually marked. Clicking a menu item calls `onSelect(id)`.
- [ ] Click-to-toggle (use `toggleLayer` from `lib/tileLayers.ts`): Topo ↔ the last-picked OpenFreeMap style (defaults to Liberty). Selecting a non-topo item also updates `lastOpenFreeMapId`.
- [ ] Hide-after-500 ms: wrap the square + menu in one container; `mouseenter` clears a pending hide timeout, `mouseleave` starts a 500 ms timeout that hides the menu. Hovering the menu (a child) therefore keeps it open.
- [ ] `L.DomEvent.disableClickPropagation` / `disableScrollPropagation` on the control so clicks/scroll don't leak to the map (mirrors `LocateButton`).

## Notes

- Toggle and hover are independent: click flips the layer instantly without opening the menu; hover opens the menu without changing the layer.
- Toggle bookkeeping: moving off a non-topo layer (e.g. Bright) to Topo sets `lastOpenFreeMapId` to that layer; moving off Topo restores `lastOpenFreeMapId` unchanged.
