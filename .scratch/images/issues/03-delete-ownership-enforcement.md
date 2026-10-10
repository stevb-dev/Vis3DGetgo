# 03: Delete + ownership enforcement

Status: resolved
Feature: images

## Context

`DELETE /api/images/:id` returns 501. Ownership: uploader or admin may delete.

## Requirements

- [x] Load the image; 404 if missing
- [x] `image.userId === req.userId` OR `req.userRole === 'ADMIN'` — else 403 (do not reveal existence to non-owners: 404 vs 403 decision documented)
- [x] Unlink the file from the volume before/after row delete; handle missing file gracefully
- [x] Consider renumbering remaining `order` values (or leave gaps — decide)

## Notes

- See `.scratch/auth/issues/03-roles-and-admin.md` for the role plumbing.

## Comments

- 2026-10-10 (grilling round): 403 chosen — image existence is already public via `GET /api/locations/:id` (full rows incl. `userId` are returned to everyone), so a fake 404 would only obscure a useful error. Sibling orders are shifted down in the same transaction (contiguity kept — grilling decision). Deleting the pinned thumbnail → FK SetNull → fallback to first-by-order automatically.
- 2026-10-10 (agent): Implemented in `routes/images.ts`; best-effort file unlink after the row delete (`force: true`, missing file tolerated). E2E verified: owner 200, non-owner 403 with reason, admin 200, missing 404, orders contiguous 1..N after delete.
