# 02: Source and seed demo models

Status: ready-for-human
Feature: models-3d

## Context

The app needs 2–3 real GLB demo models (one per seeded location) to make the 3D viewer demonstrable. Content choice is a human decision (licensing, aesthetics).

## Requirements

- [ ] Pick 2–3 CC-licensed models (Sketchfab CC, or author in Blender)
- [ ] Export/optimize: `npx gltf-pipeline -i model.glb -o model-compressed.glb --draco.compressionLevel=7`
- [ ] Keep each ≤5MB; place into `backend/models/`
- [ ] Register them in the DB (seed script or admin endpoint from ticket 01)

## Notes

- Draco-compressed GLBs need the Draco decoder — drei's `useGLTF` + `@react-three/drei` bundles it; verify in ticket 03.
