# 03: Delete + ownership enforcement

Status: ready-for-agent
Feature: images

## Context

`DELETE /api/images/:id` returns 501. Ownership: uploader or admin may delete.

## Requirements

- [ ] Load the image; 404 if missing
- [ ] `image.userId === req.userId` OR `req.userRole === 'ADMIN'` — else 403 (do not reveal existence to non-owners: 404 vs 403 decision documented)
- [ ] Unlink the file from the volume before/after row delete; handle missing file gracefully
- [ ] Consider renumbering remaining `order` values (or leave gaps — decide)

## Notes

- See `.scratch/auth/issues/03-roles-and-admin.md` for the role plumbing.
