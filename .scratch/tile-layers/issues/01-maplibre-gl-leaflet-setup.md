# 01: MapLibre GL Leaflet setup

Status: ready-for-agent
Feature: tile-layers

## Context

OpenFreeMap is vector-only, so it renders through MapLibre GL JS embedded in
Leaflet. Add the two dependencies and wire up MapLibre's worker + CSS for Vite.

## Requirements

- [ ] Add `maplibre-gl` and `@maplibre/maplibre-gl-leaflet` to `frontend/package.json` (both ESM).
- [ ] Import `maplibre-gl/dist/maplibre-gl.css` once (suggest `frontend/src/main.tsx`).
- [ ] Set the worker URL once at app startup (suggest `frontend/src/main.tsx`):
      `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'` then `setWorkerUrl(workerUrl)` (from `maplibre-gl`).
- [ ] If TypeScript can't resolve the `?worker&url` module (strict `vite/client` types may not cover the combined query), add a one-line declaration to `frontend/src/vite-env.d.ts`:
      `declare module '*?worker&url' { const src: string; export default src }`.
- [ ] `tsc && vite build` clean after the dependency install.

## Notes

- `@maplibre/maplibre-gl-leaflet` exposes `maplibreGL({ style, attribution })` and `.getMaplibreMap()`. It is 2D-only (no pitch/bearing/rotation) — the reason the OpenFreeMap "3D" view is out of scope (see spec).
- No `vite.config.ts` change is expected — the `?worker&url` import is handled by Vite out of the box.
