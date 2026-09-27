# images — spec

Image upload pipeline: multipart → multer (memory storage) → sharp (resize ≤1200×800, WebP q85) → `/uploads` volume → `Image` row. Carousel ordering via `order`. Owner-or-admin delete.

## Endpoints

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| POST | `/api/locations/:id/images` | Yes | open — ticket 01 |
| DELETE | `/api/images/:id` | Yes (owner/admin) | open — ticket 03 |

## Notes

- Files: UUID filename, `.webp`; DB stores `originalName`, `filePath` (`/uploads/<uuid>.webp`), `fileSize`, `mimeType`.
- Size limit from `MAX_UPLOAD_MB` env (default 5).
- Nginx serves `/uploads/` directly from the shared volume.
- Deleted images must also unlink the file (and vice versa: DB rollback should remove a written file).

## Tickets

- `01-upload-pipeline-multer-sharp.md`
- `02-carousel-ordering-api.md`
- `03-delete-ownership-enforcement.md`
- `04-upload-ui-carousel.md`
