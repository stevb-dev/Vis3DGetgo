# Handoff — SPZ viewer camera frame-fit saga (2026-10-18)

Session context for the next agent. This session fixed the SPZ viewer's initial
camera, which went through three rounds driven by the first real browser pass
on the admin-uploaded monument `.spz` (`fae18f83-…spz`). Read the build log
(`docs/implementation-status.md` §11 Viewer bullets + bug ledger §13) and
tickets `.scratch/models-3d/issues/04` (resolved) and `05` (open) for the full
narrative.

## The three rounds

1. **Camera inside the model.** `SplatViewer` framed on
   `gsplat.instance.meshInstance.aabb` — but the `gsplat` component is
   **unified** by default and `instance` is `undefined` for unified components
   (the engine renders them via the gsplat director/placement system). The
   lookup always missed → fallback pose `(0,0,2.5)` inside any monument-scale
   splat. Fix: read `gsplat.customAabb` (falls through to the resource's
   parse-time AABB).
2. **Camera kilometres away.** The real AABB includes capture strays — exact
   quantiles (below) showed the monument's positions **saturate the SPZ 24-bit
   range at ±2047** while medians sit at ~1–17. First attempt: per-axis
   p0.1–p99.9 quantile box on stride-sampled `resource.centers`. Still ±1600+.
3. **Still too far.** The stray content is a *continuous radial haze* (half the
   points within ~80 units of the median; plaza/ground content, not a few
   flyers), so box bounds can't hug the model. Final: `robustFrameSphere` — a
   sphere around the per-axis **median** with radius = a quantile of sample
   distances from that point. Shipped at p75 (≈478 units), then the user tuned
   `FRAME_DISTANCE_QUANTILE` to **0.25** in the browser and confirmed "works
   fine for now" (commit `5f2d6ed`). Fallback chain: `customAabb` →
   `resource.aabb` → fixed pose. True viewport fit (fov/aspect, ~18°
   elevation) unchanged.

## Non-obvious implementation points

- `asset.resource.centers` (Float32Array, dequantized splat positions) is
  prepared at parse time (`prepareCenters` defaults on) — the viewer's
  percentile pass reads it directly, no extra decode. ≤250k stride-sampled
  points, three axis sorts + one distance sort, ~tens of ms after load.
- The monument file's ±2047 extremes are **quantization saturation**: the
  v3→v4 conversion re-quantizes and clamps positions outside the representable
  range. The stored file is the converted one (the original v3 buffer was
  discarded at upload), so any backend cleanup must operate on the v4 file —
  see ticket 05.
- Diagnostic workflow worth reusing: `@playcanvas/splat-transform`'s
  `computeStats` (16-bin histograms) for a quick look, and a chunk-`read`
  pass (`ChunkDataPool` + `field('position')`) for exact percentiles. Both ran
  as throwaway node scripts inside `backend/` (deleted; the pattern is in
  ticket 04's comments).

## Verification state

- `tsc` + `vite build` green each round; user browser-verified the framing on
  the monument (three iterations) — final: framed correctly, angle good.
- Seeded raccoon spot-check implied OK (same code path; its core is much
  tighter than the monument's).
- Not clicked through: GLB viewer unchanged (untouched this session).

## Remaining work

- `models-3d/05` (ready-for-agent): filter outlier gaussians at
  upload/seed conversion (splat-transform already ships `FilterFloaters` /
  `FilterCluster` actions — likely the implementation path), re-convert the
  stored monument file.
- `deployment` (0/2) — prod runbook + backup/restore verification + cron docs.
- A landscape `.spz` for Matka (raccoon placeholder); conversion RAM guard.
- `infra/02` is `ready-for-human`.

## Suggested skills

`grilling` if ticket 05's filter policy needs design decisions (user drives via
the interactive question tool, per `AGENTS.md`); `code-review` after the
deployment chunk; `diagnosing-bugs` with the headless-Edge screenshot loop
pattern established this week (`scripts/verify-map-render.ps1`).
