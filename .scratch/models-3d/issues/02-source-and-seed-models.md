# 02: Source and seed demo models

Status: ready-for-human
Feature: models-3d

## Context

The app needs 2–3 real demo models (one per seeded location) — GLB meshes and/or
SPZ Gaussian splats — to make the viewer demonstrable. Content choice is a human
decision (licensing, aesthetics).

## Requirements

- [ ] Pick 2–3 CC-licensed models (Sketchfab CC, or author in Blender)
- [ ] GLB: export/optimize `npx gltf-pipeline -i model.glb -o model-compressed.glb --draco.compressionLevel=7`
- [ ] SPZ: source a `.spz` (or convert a `.ply`/`.splat` with `super-splat` / `gaussian-splatting`)
- [ ] Keep each ≤50MB; place into `backend/models/`
- [ ] Register them in the DB (seed script via Prisma, or the admin upload endpoint from ticket 01) — set `Model.format` to GLB or SPZ

## Notes

- Draco-compressed GLBs need the Draco decoder — drei's `useGLTF` + `@react-three/drei` bundles it; verify in ticket 03.
- SPZ files need a Gaussian-splat viewer, not `useGLTF` — see ticket 03.
