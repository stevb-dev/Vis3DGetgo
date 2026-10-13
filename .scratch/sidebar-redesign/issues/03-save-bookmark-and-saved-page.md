# 03: Save (bookmark) + /saved page

Status: resolved
Feature: sidebar-redesign
Blocked by: 01

## Context

Per-user "saved locations" bookmark feature: a Save button in the sidebar
header and a /saved page listing bookmarks.

## Requirements

- [x] SavedLocation model (userId + locationId, unique per pair, cascade on delete)
- [x] Endpoints (auth-required): `GET /api/locations/:id/save` → `{ saved }` (read), `POST /api/locations/:id/save` → toggle (returns new `{ saved }`), `GET /api/saved/locations` → list
- [x] Save button in the sidebar header (Bookmark icon), filled when saved, toggles on click
- [x] Guests see the button; clicking prompts log-in (matches ImageDropzone pattern)
- [x] /saved route (header nav link, auth-required): card list — name, category label, thumbnail, coords, Unsave; click flies map + opens sidebar (cards link to `/locations/:id?fly=1`)
- [x] Invalidate saved queries after toggle

## Notes

- Empty state for no saved locations.

## Comments

- 2026-10-13 (agent): Implemented `SavedLocation` model (unique per user+location, cascade) + `routes/saved.ts` (GET/POST `/locations/:id/save`, GET `/saved/locations`). Save read uses a per-user query key; POST returns the new `{ saved }` (handles the P2002 double-save race). Sidebar header gained a Bookmark button (filled when saved, guests → log-in). New `pages/SavedPage.tsx` (protected) with a card list + Unsave + empty state; cards link with `?fly=1` so `MapPage` flies the map to the location on arrival. Verified by live E2E (read/toggle/list/401).
- 2026-10-13 (agent, follow-up): cards now show a Share button in a bottom action row (Share + Unsave side by side) instead of the coordinates line — reuses `buildShareUrl` from `lib/utils.ts`.
