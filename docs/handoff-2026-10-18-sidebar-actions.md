# Handoff — sidebar action-button relayout + tooltips (2026-10-18)

Session context for the next agent. A small UX round on `LocationSidebar.tsx`:
the sidebar's action buttons moved out of the sticky header to a row under the
category label, every icon button gained a styled tooltip (new Radix tooltip
primitive), and a z-index bug with the Close tooltip was fixed. Follow-up
comment appended to `.scratch/sidebar-redesign/issues/02` (still `resolved`).

## What landed

1. **Buttons moved** — the sticky header now holds only the title + description
   + **Close** button. Save/Share/Edit/Delete/Report render in a row directly
   below the category badge (below the edit form while editing; the existing
   visibility rules are unchanged — Edit/Delete/Report hidden while editing,
   Report only on other users' locations). Save/Share stay visible while
   editing, as before.
2. **Tooltips** — new `components/ui/tooltip.tsx` (Radix shadcn-style) +
   `@radix-ui/react-tooltip` dependency. Every sidebar icon button, including
   Close, is wrapped in `<Tooltip>`: "Save location"/"Unsave location"
   (dynamic), "Copy share link", "Edit location", "Delete location",
   "Report location", "Close". Native `title` attributes removed in favor of
   the tooltips; `aria-label`s kept. A single `<TooltipProvider
   delayDuration={200}>` wraps the `<aside>`.
3. **Follow-up UX round** (user feedback): the moved buttons are **centered**
   (`justify-center`) and **slightly larger** — `h-10 w-10` buttons (up from
   `h-9 w-9`) with 20px icons via `[&_svg]:size-5` on the button.
4. **Bug fixed: Close tooltip under the app header (z-fighting)**. The app's
   top nav `Header` sits at `z-[1100]`; the tooltip rendered at `z-[1001]`, so
   the Close button's tooltip (which pops above the X, near the viewport top)
   was drawn *behind* the page header. Fixes:
   - `TooltipContent` z-index raised to `z-[1200]` (above the app header and
     Leaflet's z-1000 panes);
   - the Close tooltip uses `side="bottom"` so it never overlaps the page
     header;
   - the sidebar's sticky header is now fully opaque (`bg-card`, dropped
     `bg-card/95 backdrop-blur`) so scrolled content can't ghost through it.

## Non-obvious implementation points

- **Button icon sizing**: the button base has `[&_svg]:size-4`, a compound
  selector that beats the icons' own `h-*`/`w-*` classes regardless of order.
  Icon size must be overridden at the button level (`[&_svg]:size-5` in
  `className`); `cn` uses twMerge, which resolves the `size-4`/`size-5`
  conflict within the `[&_svg]` variant. Verified both rules compile into the
  CSS with the size-5 rule winning.
- **Dependency in Docker**: the frontend dev server runs in a container whose
  `node_modules` come from the Linux image (compose mounts only
  `src/public/configs`). `npm install` on the **host** updates the lockfiles
  for future image builds but does not reach the running container — the
  container's package.json is image-baked. Patch the running container with
  `docker compose exec frontend npm install @radix-ui/react-tooltip` (done
  this session; verified with `node -e
  "console.log(require.resolve('@radix-ui/react-tooltip'))"` inside the
  container). A future `docker compose up --build` picks the dep up from the
  updated host `package.json`/`package-lock.json` via `npm ci`.
- **z-index ladder**: Leaflet panes ≤ z-1000 → dialogs/overlays z-1000/1001 →
  app Header z-1100 → tooltips z-1200. `CreateLocationPanel.tsx` still uses
  the old `bg-card/95 backdrop-blur` sticky-header pattern; leave or align as
  you prefer.

## Git state (uncommitted)

Nothing from this or the previous two sessions has been committed yet — the
tree carries pre-existing uncommitted work (BackToMapButton, locationHistory,
App.tsx, SavedPage, auth/report pages, implementation-status §updates, …).

**This session's files** (commit these together as one sidebar-actions change):
`frontend/package.json`, `frontend/package-lock.json`,
`frontend/src/components/ui/tooltip.tsx` (new),
`frontend/src/components/LocationSidebar.tsx`,
`.scratch/sidebar-redesign/issues/02-sidebar-reorder-and-meta.md`.

## Verification state

- Host `npm run build` (`tsc` + `vite build`) green; chunk-size warnings are
  pre-existing (ModelViewer ~2.9 MB).
- Compiled CSS spot-checked for `[&_svg]:size-5`, `h-10`, `z-[1200]` — all
  present.
- **Pending: interactive browser pass** — tooltip appearance/positioning
  (especially the Close tooltip below the X), the centered/larger button row,
  and the opaque sticky header during scroll have not been clicked through.

## Suggested skills

None specific; `diagnosing-bugs` if the tooltips misbehave in the browser.
