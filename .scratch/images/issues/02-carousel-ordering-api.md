# 02: Carousel ordering API

Status: resolved
Feature: images

## Context

Images are ordered by the `order` column (asc). Upload sets `order = max + 1`. Reordering has no endpoint yet.

## Requirements

- [x] Decide scope: (a) creation-order only, or (b) reorder endpoint `PATCH /api/images/:id/order` (owner/admin) with a new position
- [ ] If (b): validate position range, shift siblings atomically (transaction), keep invariant "orders are contiguous per location"
- [x] `GET /api/locations/:id` already returns images ordered asc — confirm and add a test

## Notes

- Prefer minimal scope for the thesis; (b) is a nice differentiator if time allows.

## Comments

- 2026-10-10 (grilling round): Scope decision reshaped. (b) reorder endpoint was CUT — dragging order-shuffling into a community carousel opened a thumbnail-hijack hole (any user could move their own image to position 1 and silently change the map tooltip). Instead: creation-order only + **admin-pinned thumbnail** — `Location.thumbnailImageId` (nullable FK, SetNull) + admin-only `PATCH /api/locations/:id/thumbnail` accepting `{ imageId | null }`; null restores the first-by-order fallback. Additionally, the location CREATOR may pick the thumbnail from their initial upload batch (`thumbnailIndex` on the first upload to an empty location — owner/admin only). All subsequent thumbnail changes are admin-only.
- 2026-10-10 (agent): Implemented (migration `20261010000000_images_reports_thumbnail`, `PATCH /:id/thumbnail` in `routes/locations.ts`, list endpoint prefers the pin). E2E verified: pin, clear, fallback, cross-location image → 400, non-admin → 403. Sibling order-shift on delete kept (ticket 03), so orders stay contiguous 1..N.
