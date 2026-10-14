-- Report resolution (.scratch/report-resolution): two-action admin workflow
-- (Delete content / Dismiss) with soft-delete, owner notifications, an unread
-- badge, and a "My reports" view.

-- 1. Widen ReportStatus with DISMISSED (RESOLVED = content deleted, DISMISSED =
--    closed with no action). Adding an enum value is non-destructive.
ALTER TYPE "ReportStatus" ADD VALUE 'DISMISSED';

-- 2. Rename resolvedAt -> closedAt, set for BOTH closing actions. A plain
--    column rename preserves existing data.
ALTER TABLE "Report" RENAME COLUMN "resolvedAt" TO "closedAt";

-- 3. Optional admin note (shown to the reporter on dismiss, owner on delete).
ALTER TABLE "Report" ADD COLUMN "note" TEXT;

-- 4. Soft-delete timestamps (never hard-delete during moderation).
ALTER TABLE "Image" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Location" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- 5. Admin "last seen reports" watermark for the unread badge.
ALTER TABLE "User" ADD COLUMN "lastSeenReportsAt" TIMESTAMP(3);

-- 6. NotificationType enum + snapshot-based Notification table.
CREATE TYPE "NotificationType" AS ENUM ('MODERATION_REMOVAL');

CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "contentName" TEXT NOT NULL,
    "category" "ReportCategory",
    "note" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
