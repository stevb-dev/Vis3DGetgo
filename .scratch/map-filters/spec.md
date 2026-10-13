# map-filters — spec

Category filter + zoom declutter for the map: the user picks a category (chips) to
show only those pins, and the map collapses to nothing (except the selected pin) when
zoomed out past city level with no category chosen. Purely client-side — no backend,
no migration, no new dependency.

## Decisions (grilling, 2026-10-13)

| # | Decision | Choice |
|---|---|---|
| 1 | Strategy | Category filter + zoom declutter (no marker clustering — dataset ceiling is <20) |
| 2 | "Point of interest" | Dynamic — the currently-selected category, not a static/seeded set |
| 3 | Filter UI | Chip/toggle buttons, single active category |
| 4 | Filter state | `?category=<value>` URL query param (ADR-0002: URL is the source of truth) |
| 5 | Category selected | Show only that category's pins at ALL zooms + the selected pin |
| 6 | No category selected | Below zoom 12 hide all markers; at/above 12 show everything |
| 7 | Selected-pin exemption | The selected location's marker (and any `?fly=1` target) is always visible |
| 8 | Empty map below 12, no filter | Accepted as-is — no floor, no hint |
| 9 | `seeded` role | None — the 4 landmarks are just locations with a category |
| 10 | Tracking | New `.scratch/map-filters/` feature (not folded into `frontend-map/05`) |

## Model

A single marker-visibility predicate in `MapPage` decides which markers render, from:

- `locations` — the already-fetched `['locations']` query (each row carries `category`).
- `?category=` — the active category, or absent (no filter).
- `zoom` — the live map zoom (from `useMap`/`useMapEvents`).
- `selectedId` / `?fly=1` — the currently-selected location and the external-entry target.

```
visible(loc) = isSelected(loc)                       // exemption wins
            || (category ? loc.category === category  // filter branch (all zooms)
                         : zoom >= 12)                // gate branch (no filter)
```

## Notes

- **No backend change.** `GET /api/locations` already returns `category` per location
  (added in sidebar-redesign/01); filtering + gating happen over that query.
- **Chips are plain Tailwind** — reuse the native-select/no-Radix preference; no new
  dependency.
- **Overlay z-index > 1000** over the Leaflet map (`CONTEXT.md` Map UX conventions).
- **Preserve `?category=` across navigation**: the map stays mounted between `/` and
  `/locations/:id` (nested route), so a marker click or close must not silently drop
  the filter — see ticket 01.
- **External entry is safe**: `?fly=1` flies to zoom 15 (above the 12 threshold) and
  the selected pin is exempt, so a share link into a non-matching category still lands
  visibly.
- `frontend-map/05` keeps only its *icons* half (seeded-vs-user visual distinction);
  its *zoom* half is superseded by this feature.

## Tickets

- `01-category-filter-control.md`
- `02-filter-markers-by-category.md`
- `03-zoom-gating-no-category.md`
- `04-selected-pin-exemption.md`
