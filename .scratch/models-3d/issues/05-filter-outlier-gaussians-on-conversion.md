# 05: Filter outlier gaussians at upload/seed conversion

Status: ready-for-agent
Feature: models-3d

Blocked by: none

## Context

The demo monument `.spz` (1,000,000 gaussians) has positions saturating the
SPZ 24-bit quantization range at ±2047 in every axis while the dense subject
core spans ~30 units (median ≈ 1–17). These are capture strays: the v3→v4
conversion (`backend/src/lib/spz.ts` → `convertSpzToV4`) re-quantizes the
positions and *saturates* points that fall outside the representable range,
leaving garbage gaussians in the stored file. The seeded raccoon has a milder
case (~4× core extent). The viewer now frames on percentile-trimmed bounds
(models-3d/04), so viewing is fixed — this ticket removes the garbage at the
source.

## Requirements

- [ ] In `convertSpzToV4` (and the seed path — both go through `ensureSpzV4`),
      filter outlier gaussians before/while re-quantizing: drop points outside
      k× a robust core extent (e.g. beyond p0.1–p99.9 per-axis bounds scaled by
      a factor, or median ± k·IQR — decide during implementation, conservative
      enough to never cut legit scene content).
- [ ] Preserve all other attributes consistently (rotations, scales, SH,
      opacity) — dropping a gaussian must not desync the streams.
- [ ] Keep the filter off (or defaulted off) for files that are already SPZ v4
      (they pass through untouched today) — decide: filter on upload only, or
      also on seed of demo files.
- [ ] Re-convert the stored monument file so the deployed demo is clean.

## Notes

- The viewer-side robust framing (04) means this is a data-quality follow-up,
  not a user-visible bug anymore.
- Evidence: `.spz` position stats collected 2026-10-18 (splat-transform
  `computeStats`) — monument ±2047 saturation vs medians ~1–17; raccoon
  full-span ~540 with medians near origin. See 04's comments.

## Comments
