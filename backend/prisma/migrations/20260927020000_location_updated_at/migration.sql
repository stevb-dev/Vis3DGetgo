-- Editable locations: track the last update time.
ALTER TABLE "Location" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
