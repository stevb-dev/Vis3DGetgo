# 04: Share button + slug URL

Status: resolved
Feature: sidebar-redesign

## Context

Share button copies a human-readable slug URL; /locations/:id stays canonical
and the slug aliases it.

## Requirements

- [x] Slug format /locations/<name>/@<lat>,<lng>; name slugified (lowercase, hyphens), coords at 5-decimal precision
- [x] Share button (Share2 icon) copies the slug URL to the clipboard + toast
- [x] Slug route resolves coords → location and redirects to canonical /locations/:id
- [x] Backend resolve (coords → location) with small tolerance for truncated coords (e.g. GET /api/locations/resolve?lat=&lng=) — nearest within ~25 m, 404 when none
- [x] Slugify helper for the name segment (URL-safe)

## Notes

- Name is cosmetic in the slug; coords are the lookup key, so renames don't break existing links (redirect lands on :id).

## Comments

- 2026-10-13 (agent): Implemented `slugifyName` in `lib/utils.ts`, a Share button in the sidebar header (clipboard + toast), `GET /api/locations/resolve?lat=&lng=` (ST_DWithin 25 m, nearest, 404 when none), and a `components/SlugResolver.tsx` route (`/locations/:slug/@:coords`) that resolves and redirects to `/locations/:id?fly=1`. Verified by live E2E (nearest match + 404).
- 2026-10-13 (agent, follow-up): two fixes. (1) `slugifyName` now keeps Unicode letters/numbers (`\p{L}\p{N}`) and the share URL percent-encodes the slug, so Cyrillic names work. (2) the route was `/locations/:slug/@:coords`, which never matched — React Router only parses `:param` when preceded by `/`, so the `@`-glued `:coords` was read literally ("No routes matched"). Changed to `/locations/:slug/:coords` (the `@` moves into the `coords` value, stripped in the resolver); URL format unchanged. Extracted `buildShareUrl` to `lib/utils.ts` for the sidebar + saved cards. Verified route matching with `matchRoutes` (Latin, Cyrillic, and `/locations/:id` non-conflict).
