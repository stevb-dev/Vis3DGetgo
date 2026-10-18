# Handoff — frontend-map closed out (2026-10-18)

Session context for the next agent. This session resolved the last three
`frontend-map` tickets (02, 03, 05) — the feature is now 5/5. Design was
settled through a grilling round (interactive question tool, per `AGENTS.md`);
the decisions are recorded in ADR-0002's new amendment. Read the build log
(`docs/implementation-status.md` §4) for the full narrative.

## What landed

1. **02 split pane** (resolved): the sidebar already had info + carousel +
   3D model sections from the landed dependencies. Added the missing pieces in
   `LocationSidebar.tsx` — a pulse **skeleton** mirroring the sidebar sections
   (no layout jump) and a distinct **404 state** ("Location not found" + Back
   to map), branched on `ApiError.status === 404`. The ticket's desktop/mobile
   split decision is superseded by ADR-0002's sidebar (noted in the ticket).
2. **03 map state + routing** (resolved): **viewport now lives in the URL** —
   `?lat=&lng=&zoom=` (`mapEffects.tsx` `ViewportPersist`: `moveend`/`zoomend`
   → `setSearchParams(..., { replace: true })`; `MapPage` `parseViewport`
   seeds center/zoom on mount, piece-wise validation with geolocation/Skopje
   fallback). A URL viewport beats geolocation; `?fly=1` still wins (Recenter
   unchanged). `navigateMap` carries the viewport params with
   `category`/`layer`. **No Zustand store** — URL-only (ADR-0002 A3); the
   ticket's store checkbox is wontfix with a comment.
3. **05 pins + zoom** (resolved): **per-category pins** (`lib/markerIcons.ts`)
   — CSS teardrop `divIcon` (`.cat-pin*` in `index.css`), distinct Tailwind
   500 hue per category + the category's white lucide icon (same icon as the
   filter chips). Selected = 600 shade, larger, white ring; the anchor is the
   pin point so selection grows upward without drifting. **Zoom half wontfix**
   (ADR-0002 A4). `leafletIcons.ts` keeps `defaultIcon` (create-location
   picker) and drops `selectedIcon` + the `.marker-selected` recolor.

## Non-obvious implementation points

- The divIcon SVGs are **hand-copied snapshots of lucide-react v0.447.0 node
  data** (from `node_modules/lucide-react/dist/esm/icons/*.js`) so they render
  outside the React tree without `react-dom/server` — no extra bundle weight,
  but they won't follow lucide version bumps (the dep is pinned `^0.447.0`).
- Pin geometry: a `size`×`size` square rotated 45° spans `size·√2`; the
  container is `Math.round(size * Math.SQRT2)` and `iconAnchor` is the bottom
  center of that box, so the visual point sits exactly on the location.
- `ViewportPersist` writes on the **initial** `setView` too (Leaflet gives no
  user-vs-programmatic origin on move events) — loading `/` immediately gains
  viewport params. Harmless: a fresh visit to `/` has no params, so the
  geolocation start still works; params only persist within a session / shared
  links.
- Icon instances are cached per (category, selected) in a module-level `Map`.

## Bug fixed this session (post-landing)

**Whole map = light-blue ocean on every fresh load.** `parseViewport` did
`Number(params.get('lat'))` — `Number(null)` is `0`, not `NaN`, so a param-less
URL parsed as center `[0, 0]` (Gulf of Guinea) and overrode the geolocation
start. Fix: `readNumberParam` treats missing/empty/non-numeric as absent.
Reproduced red / verified green with a headless-Edge screenshot loop, now
`scripts/verify-map-render.ps1` (Windows PowerShell; pixel-checks a fresh `/`
shows land, not the liberty water fill). Root cause in
`docs/implementation-status.md` §12.

## Verification state

- Frontend `tsc` + `vite build` green (chunk-size warnings pre-existing —
  ModelViewer ~2.9 MB accepted).
- Dev stack up: frontend 200 at `/`, `GET /api/locations` returns the seeded
  Skopje landmarks.
- **Pending: interactive browser pass** — the pins' look/selection state and
  the viewport URL round-trip (pan → reload → restored) have not been clicked
  through. This joins the pre-existing pending pass for the 3D viewer. The
  initial-viewport regression itself is covered by
  `scripts/verify-map-render.ps1` (PASS on the fixed code, FAIL before the fix).

## Remaining work

- `create-location-flow` (0/3) — all `ready-for-agent`.
- `deployment` (0/2) — prod runbook + backup rotation docs.
- A landscape `.spz` for Matka; conversion RAM guard for large uploads.

## Suggested skills

`grilling` for the create-flow design round (user drives via the interactive
question tool); `code-review` after the create-flow chunk; `diagnosing-bugs`
if the pin/viewport work misbehaves in the browser.
