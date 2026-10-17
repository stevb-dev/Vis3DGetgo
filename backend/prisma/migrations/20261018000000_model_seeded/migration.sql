-- Mark demo (seed-owned) models so the seed's prune only touches its own rows —
-- an admin upload on a seeded location survives re-seeding.
ALTER TABLE "Model" ADD COLUMN "seeded" BOOLEAN NOT NULL DEFAULT false;
