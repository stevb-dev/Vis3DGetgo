-- Model format (.scratch/models-3d): GLB meshes and SPZ 3D Gaussian splats.
-- The viewer picks a renderer from `Model.format` instead of parsing the
-- filePath extension.

-- 1. ModelFormat enum.
CREATE TYPE "ModelFormat" AS ENUM ('GLB', 'SPZ');

-- 2. Add the format column. The Model table is empty at this point (no model
--    has ever been registered — the feature ships now), so a plain NOT NULL
--    column is safe with no backfill.
ALTER TABLE "Model" ADD COLUMN "format" "ModelFormat" NOT NULL;
