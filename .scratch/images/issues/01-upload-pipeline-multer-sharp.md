# 01: Upload pipeline (multer + sharp)

Status: ready-for-agent
Feature: images

## Context

`POST /api/locations/:id/images` returns 501 (`backend/src/routes/images.ts`). All deps are installed (multer, sharp, uuid).

## Requirements

- [ ] Verify the location exists before accepting files (404 otherwise)
- [ ] multer memory storage; file filter: `image/jpeg`, `image/png`, `image/webp`; size limit from `MAX_UPLOAD_MB` (per file)
- [ ] sharp: `resize(1200, 800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 })` → `UPLOAD_DIR/<uuid>.webp`
- [ ] `Image` row: `userId` from token, `order` = current max order for the location + 1
- [ ] On DB failure after write: unlink the written file (no orphan uploads)
- [ ] Multi-file support (`upload.array('images', 10)`) or single — decide and document
- [ ] Invalid/missing file → 400 with clear error

## Notes

- `UPLOAD_DIR` env points at `/app/uploads` in Docker (shared volume with nginx).
