-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('SPAM', 'INAPPROPRIATE', 'WRONG_LOCATION', 'BROKEN', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "seeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thumbnailImageId" INTEGER;

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "imageId" INTEGER,
    "locationId" INTEGER,
    "reporterId" INTEGER NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_thumbnailImageId_key" ON "Location"("thumbnailImageId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_thumbnailImageId_fkey" FOREIGN KEY ("thumbnailImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Constraints Prisma cannot express ─────────────────────────────────────

-- A report targets exactly one of Image or Location.
ALTER TABLE "Report" ADD CONSTRAINT "Report_exactly_one_target_check"
CHECK (("imageId" IS NOT NULL AND "locationId" IS NULL) OR ("imageId" IS NULL AND "locationId" IS NOT NULL));

-- One report per reporter per target (NULLs are distinct in Postgres unique
-- indexes, hence partial indexes on the non-null side of each target).
CREATE UNIQUE INDEX "Report_reporter_image_unique"
ON "Report" ("reporterId", "imageId") WHERE "imageId" IS NOT NULL;

CREATE UNIQUE INDEX "Report_reporter_location_unique"
ON "Report" ("reporterId", "locationId") WHERE "locationId" IS NOT NULL;
