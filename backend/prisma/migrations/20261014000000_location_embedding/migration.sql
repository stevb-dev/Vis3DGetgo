-- Search feature (.scratch/search): vector embedding column for semantic search.
-- pgvector is compiled into the db image (see db/Dockerfile); this enables the
-- extension and adds the nullable embedding column (384-dim multilingual-e5-small).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Location" ADD COLUMN "embedding" vector(384);
