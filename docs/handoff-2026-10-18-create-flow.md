# Handoff — create-location-flow closed out (2026-10-18)

Session context for the next agent. This session implemented `create-location-flow`
(3/3): the "New location" flow is now nested under the live map, so the viewport
never resets, with a side-panel form, explicit cancel, and a discard prompt.
Design was settled in the 2026-10-15 grilling round (spec) plus one new decision
this session (the picked pin's look). Build log: `docs/implementation-status.md` §12.

## What landed

1. **01 nested route** (`App.tsx`, `MapPage.tsx`): `/locations/new` is a child
   of the `/` map route inside a `ProtectedRoute` layout route (guests still
   redirect to login — verified headlessly). `pages/CreateLocationPage.tsx`
   (own `MapContainer`, the viewport-reset root cause) is deleted;
   `components/CreateLocationPanel.tsx` renders via the map's `<Outlet>`.
   `MapPage` gained `isCreateMode = useMatch('/locations/new')`, which guards
   the `:id` match (`"new"` → NaN would fake a selection).
2. **02 create mode** (`MapPage.tsx`, `CreateLocationPanel.tsx`): markers,
   SearchBox, CategoryFilter and the empty-state pill are hidden in create
   mode; tile switcher + locate button stay. `MapClickHandler` is swapped for
   `CreateClickCatcher` (map click picks a spot). Pre-pick panel shows
   "Click the map to choose a spot" + Cancel; after a pick the form fills the
   panel with "Pinned at lat,lng" and re-clicking moves the pin.
3. **03 cancel + post-create** (`CreateLocationPanel.tsx`): Cancel/X/Escape →
   `/` via `MapPage`'s `navigateMap` (preserves `?category=`, `?layer=`,
   viewport); discard prompt when name/description non-empty or category ≠
   MONUMENTS. Post-create → `/locations/:id` **without** `?fly=1` — no recenter.

## Non-obvious implementation points

- **Picked state cannot live in the panel.** The panel renders as an `<Outlet>`
  sibling *outside* `MapContainer`, so `useMapEvents`/`useMap`/`<Marker>` don't
  work there. `MapPage` owns the transient `picked` + `pickedCategory` state
  and shares it via `<Outlet context>`; `CreateClickCatcher` (inside the map)
  picks, and the picked `<Marker>` renders inside `MapContainer`. The ticket's
  "panel-local state" note is superseded by this — same transient semantics,
  still not in the URL.
- **`useOutletContext` reads the *nearest* Outlet.** Wrapping the create route
  in a `ProtectedRoute` layout route put ProtectedRoute's own `<Outlet>` (no
  context) between MapPage's `<Outlet context>` and the panel — the panel
  crashed destructuring `undefined`. `ProtectedRoute` now guards inline
  (`children` passthrough; layout usage for other routes unchanged), so no
  intermediate Outlet shadows the map's context. Bug-ledger §13.
- The picked pin is the **category pin following the form's category
  selection** (new grilling decision this session): `form.watch('category')`
  in the panel pushes `setPickedCategory` through the Outlet context, so the
  pin recolors live as the dropdown changes.
- `MapPage` resets `picked`/`pickedCategory` when `isCreateMode` flips false,
  so re-entering starts clean.
- The old z-index hazard (create-location dialog invisible) no longer applies:
  the panel is a normal flex sibling like `LocationSidebar`, not an overlay.

## Verification state

- `tsc` + `vite build` green; the null-island regression script
  (`scripts/verify-map-render.ps1`) still PASSes.
- Guest → `/locations/new` lands on `/login` (nested ProtectedRoute,
  headless-verified).
- **Pending: authenticated browser pass** — pick → form → create →
  `/locations/:id` without fly; cancel/Escape with and without the discard
  prompt; viewport preserved entering/leaving create mode. (Backend
  `POST /locations` is unchanged and already covered.)

## Remaining work

- `deployment` (0/2) — prod runbook + backup rotation docs.
- A landscape `.spz` for Matka; conversion RAM guard for large uploads.

## Suggested skills

`code-review` after this chunk; `grilling` if the deployment docs need design
decisions (user drives via the interactive question tool, per `AGENTS.md`).
