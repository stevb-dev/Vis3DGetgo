# 01: Category filter control + `?category=` URL state

Status: resolved
Feature: map-filters

## Context

A row of category chip/toggle buttons overlaid on the map lets the user pick a single
active category. The active category lives in the URL as `?category=<value>` (ADR-0002:
URL is the source of truth, shareable, survives reload). No chip active = no filter.

## Requirements

- [x] `CategoryFilter` component rendered as a map overlay (`z-index > 1000`): a single horizontally-scrollable row of chips (`.no-scrollbar` in `index.css`) with a per-category lucide icon (`LOCATION_CATEGORY_ICONS`) and left/right edge arrows that hide at each end. Plain Tailwind + lucide — no Radix, no new dependency.
- [x] One chip per `LocationCategory` value, labelled from `LOCATION_CATEGORY_LABELS` (in `frontend/src/lib/types.ts`), in the enum's order. An "All" affordance (or clearing the active chip) returns to no-filter.
- [x] **Single-select**: exactly one active chip, or none. Tapping the active chip clears it; tapping a different chip switches.
- [x] State is the URL query param `?category=<enum value>` via `useSearchParams`. Unknown/garbage value is ignored (treat as no filter).
- [x] **Preserve `?category=` across navigation.** The map stays mounted between `/` and `/locations/:id`; `handleMarkerClick` (`navigate('/locations/:id')`) and the close/empty-map-click (`navigate('/')`) must carry the current search params, or the filter silently resets. Introduce a shared navigate helper or re-attach the current `?category=` on those transitions.
- [x] Filter is purely cosmetic client-side — it must not touch the `['locations']` query or refetch.

## Notes

- Placement is a map overlay; do not collide with the `LocateButton` (bottom-right) or the future search box (top-left).
- The chips render only the control + URL state; the actual marker filtering is ticket 02.

## Comments

- 2026-10-13 (agent): Implemented. `CategoryFilter` component (single-row horizontally-scrollable chip row, top-center overlay, single-select) synced to `?category=` via `useSearchParams` (functional updater + `replace: true`). `isLocationCategory` guard added to `lib/types.ts`. `?category=` preserved across marker-click/sidebar navigation via a `navigateMap` helper in `MapPage` (the transient `fly` hint is dropped, not carried). Verified by `tsc` + vite build.
- 2026-10-13 (agent, grilling follow-up): chips gained a per-category lucide icon (`lib/categoryIcons.tsx`, also used in the sidebar meta block) and left/right scroll arrows (`ChevronLeft`/`ChevronRight`, fixed ~160px smooth step) that hide at each end.
