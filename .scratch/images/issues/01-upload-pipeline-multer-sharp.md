# 01: Upload pipeline (multer + sharp)

Status: resolved
Feature: images

## Context

`POST /api/locations/:id/images` returns 501 (`backend/src/routes/images.ts`). All deps are installed (multer, sharp, uuid).

## Requirements

- [x] Verify the location exists before accepting files (404 otherwise)
- [x] multer memory storage; file filter: `image/jpeg`, `image/png`, `image/webp`; size limit from `MAX_UPLOAD_MB` (per file)
- [x] sharp: `resize(1200, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 })` → `UPLOAD_DIR/<uuid>.webp`
- [x] `Image` row: `userId` from token, `order` = current max order for the location + 1
- [x] On DB failure after write: unlink the written file (no orphan uploads)
- [x] Multi-file support (`upload.array('images', 10)`) or single — decide and document
- [x] Invalid/missing file → 400 with clear error

## Notes

- `UPLOAD_DIR` env points at `/app/uploads` in Docker (shared volume with nginx).

## Comments

- 2026-10-10 (agent): Implemented in `backend/src/routes/images.ts` + `lib/images.ts`. Decisions from the grilling round: multi-file (≤10, documented), all-or-nothing batches (any invalid file → 400 with a clear message, incl. `LIMIT_FILE_SIZE`/type errors), per-location cap `MAX_IMAGES_PER_LOCATION` (default 200) → 400, per-user rate limit (20/10 min, keyed by JWT userId), `order = max+1` computed inside an interactive transaction with a `FOR UPDATE` row lock on the Location (no concurrent ties), memory storage (50 MB worst case, documented). EXIF orientation is applied then metadata stripped (privacy). Also: `thumbnailIndex` FormData field — honored only on the location creator's initial batch (0 images, requester is owner or admin), see ticket 02. Verified: 15 new unit tests (filter, sharp transform, permission helper) + live E2E (201, 400s, 404, 401, 429, cap, pin-on-first-batch).
