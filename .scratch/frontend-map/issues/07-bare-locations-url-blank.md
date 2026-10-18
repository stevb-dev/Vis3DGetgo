# 07: Bare /locations URL renders a blank page

Status: resolved
Feature: frontend-map

## Context

User report (2026-10-18): visiting `/locations` without query parameters
(user-typed URL, trimmed share link, stale bookmark) renders an empty
map / blank page.

## Root cause

No route matched `/locations`. The app's only map URLs are `/` (map home)
and the nested `/locations/:id` / `/locations/new` (plus the two-segment
share-slug alias `/locations/:slug/:coords`). `<Routes>` therefore rendered
nothing below the header — a blank content area. Query parameters do not
participate in route matching, so the URL was blank regardless of them.

## Fix

- The route tree is extracted to `src/routes.tsx` as an exported `appRoutes`
  constant (App renders it inside `<Routes>` unchanged; keeping it out of
  App.tsx preserves Fast Refresh for the component module) so route coverage
  is testable without mounting the whole app.
- A top-level redirect route maps the bare path to the canonical map URL:
  `<Route path="/locations" element={<Navigate to="/" replace />} />`.

## Comments

- 2026-10-19 (agent): Fixed. Regression test added at
  `frontend/src/App.test.tsx` — `createRoutesFromChildren(appRoutes)` +
  `matchRoutes` asserts the bare `/locations` URL matches (red before the
  redirect, green after) plus coverage for `/`, `/locations/:id` and
  `/locations/new`. Verified: `npm test` (9/9), `npx tsc --noEmit`,
  `npm run build`.
