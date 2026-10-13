-- CreateEnum
CREATE TYPE "LocationCategory" AS ENUM ('MUSEUMS', 'ART_GALLERIES', 'MONUMENTS', 'EDUCATION', 'ENTERTAINMENT', 'HEALTH', 'HOUSING', 'STORES', 'FINANCE', 'FOOD_AND_DRINK', 'NATURE');

-- AlterTable (non-null with a MONUMENTS default backfills existing rows)
ALTER TABLE "Location" ADD COLUMN     "category" "LocationCategory" NOT NULL DEFAULT 'MONUMENTS';

-- CreateTable
CREATE TABLE "SavedLocation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedLocation_userId_locationId_key" ON "SavedLocation"("userId", "locationId");

-- AddForeignKey
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
