# 01: Category filter control + `?category=` URL state

Status: ready-for-agent
Feature: map-filters

## Context

A row of category chip/toggle buttons overlaid on the map lets the user pick a single
active category. The active category lives in the URL as `?category=<value>` (ADR-0002:
URL is the source of truth, shareable, survives reload). No chip active = no filter.

## Requirements

- [ ] `CategoryFilter` component rendered as a map overlay (`z-index > 1000`), plain Tailwind — no Radix, no new dependency.
- [ ] One chip per `LocationCategory` value, labelled from `LOCATION_CATEGORY_LABELS` (in `frontend/src/lib/types.ts`), in the enum's order. An "All" affordance (or clearing the active chip) returns to no-filter.
- [ ] **Single-select**: exactly one active chip, or none. Tapping the active chip clears it; tapping a different chip switches.
- [ ] State is the URL query param `?category=<enum value>` via `useSearchParams`. Unknown/garbage value is ignored (treat as no filter).
- [ ] **Preserve `?category=` across navigation.** The map stays mounted between `/` and `/locations/:id`; `handleMarkerClick` (`navigate('/locations/:id')`) and the close/empty-map-click (`navigate('/')`) must carry the current search params, or the filter silently resets. Introduce a shared navigate helper or re-attach the current `?category=` on those transitions.
- [ ] Filter is purely cosmetic client-side — it must not touch the `['locations']` query or refetch.

## Notes

- Placement is a map overlay; do not collide with the `LocateButton` (bottom-right) or the future search box (top-left).
- The chips render only the control + URL state; the actual marker filtering is ticket 02.

## Comments
