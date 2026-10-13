# 01: Location category enum

Status: resolved
Feature: sidebar-redesign

## Context

The sidebar meta block will show a location category, but Location has no
category field today. Add a fixed 10-value enum, a migration with MONUMENTS
backfill, and expose it through create/edit/detail.

## Requirements

- [x] LocationCategory enum in backend/prisma/schema.prisma: MUSEUMS, ART_GALLERIES, MONUMENTS, EDUCATION, ENTERTAINMENT, HEALTH, HOUSING, STORES, FINANCE, FOOD_AND_DRINK, NATURE (11 values — NATURE added 2026-10-13 for Matka Canyon)
- [x] Location.category field, non-null, default MONUMENTS; migration backfills existing rows to MONUMENTS
- [x] Create accepts/validates category (required); PATCH accepts category
- [x] GET /api/locations + GET /api/locations/:id return category
- [x] frontend/src/lib/types.ts: enum type + LOCATION_CATEGORY_LABELS map (title-case labels; "Food and Drink" is one value)
- [x] Seed: curated categories for the 4 Skopje demo locations (Macedonia Square / Skopje Fortress / Stone Bridge → MONUMENTS, Matka Canyon → NATURE)

## Notes

- Future per-category marker icons (frontend-map/05) build on this.

## Comments

- 2026-10-13 (agent): Implemented. `LocationCategory` enum (11 values — NATURE added per grilling round) + non-null `category` column with MONUMENTS backfill; migration `20261013000000_location_category_saved_location`. Create requires category, PATCH accepts it, list/detail return it. Frontend: `LocationCategory` + `LOCATION_CATEGORY_LABELS` in `types.ts`, category select in the create + edit forms. Seed assigns MONUMENTS (Square/Fortress/Stone Bridge) and NATURE (Matka Canyon). Also fixed a pre-existing schema drift: `Image.user` now declares `onDelete: Cascade` to match the committed init migration (no DB change). Verified by 60 unit tests + live E2E.
