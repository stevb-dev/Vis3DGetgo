# 01: pgvector extension + embedding column

Status: ready-for-agent
Feature: search

## Context

`vector` must be a loadable extension before the embedding column can exist. The db image is `postgis/postgis:16-3.4-alpine`, which ships PostGIS but **not** pgvector — so `CREATE EXTENSION vector` will fail out of the box. `postgresqlExtensions` preview is already enabled and `postgis` is already listed in the datasource.

## Requirements

- [ ] Provision pgvector in the database image (custom image / compose build step / package install — pick the least invasive route that keeps `postgis` working). `CREATE EXTENSION vector` must succeed.
- [ ] Add `vector` to the Prisma datasource `extensions = [postgis, vector]`.
- [ ] Add `embedding Unsupported("vector(384)")?` to the `Location` model (nullable — degrade path writes NULL).
- [ ] Generate a migration; confirm it emits `CREATE EXTENSION IF NOT EXISTS vector` and `ALTER TABLE "Location" ADD COLUMN "embedding" vector(384)`.
- [ ] Verify `docker-compose up` migrates cleanly on a fresh volume, and the existing spatial index still works.

## Notes

- Dimension 384 is fixed by `multilingual-e5-small`; don't change it independently of the model (ticket 02).
- If the extension line belongs to the init migration vs a new one, follow whatever the `postgis` extension did for consistency.
- The column is intentionally **not** backfilled here — see ticket 04.

## Comments
