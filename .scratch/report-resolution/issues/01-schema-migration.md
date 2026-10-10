# 01 — Schema migration for report resolution

Status: ready-for-agent

Extend the Prisma schema and add a migration implementing the data-model changes
for report resolution. Do not write application code — schema + migration only.

## Changes to `backend/prisma/schema.prisma`

- `ReportStatus` enum: `OPEN | RESOLVED | DISMISSED` (currently `OPEN | RESOLVED`).
- `Report`:
  - Rename `resolvedAt DateTime?` → `closedAt DateTime?`.
  - Add `note String?` (optional admin note).
- `Image`: add `deletedAt DateTime?`.
- `Location`: add `deletedAt DateTime?`.
- `User`: add `lastSeenReportsAt DateTime?` and the back-relation
  `notifications Notification[]`.
- New enum `NotificationType { MODERATION_REMOVAL }`.
- New `Notification` model (snapshot-based; no FK to content):
  - `id Int @id @default(autoincrement())`
  - `userId Int` + `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
  - `type NotificationType`
  - `contentName String` (image `originalName` or location `name`)
  - `category ReportCategory?`
  - `note String?`
  - `readAt DateTime?`
  - `createdAt DateTime @default(now())`

## Notes

- The `ReportStatus` change is a destructive enum change; the migration may need
  to widen the underlying type. Keep the existing `Report` CHECK / partial
  unique indexes intact.
- Renaming `resolvedAt` → `closedAt` must preserve existing data (a plain column
  rename).
- No changes to the `Report`→`Image`/`Location` cascade behavior (still
  `onDelete: Cascade`).

## Acceptance criteria

- `prisma migrate dev` generates and applies a clean migration with no data loss.
- Existing `resolvedAt` values survive as `closedAt`.
- `Notification` model and `NotificationType` enum exist as specified.
- `Image.deletedAt`, `Location.deletedAt`, `User.lastSeenReportsAt`,
  `Report.note` all exist.
