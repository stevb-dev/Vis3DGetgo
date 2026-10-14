# 03: R3F 3D model viewer component

Status: resolved
Feature: models-3d

## Context

Detail pane shows the location's model via a modal viewer. Deps: three 0.160,
@react-three/fiber 8, @react-three/drei 9 (already installed) + `@mkkellogg/gaussian-splats-3d`
(added here for SPZ).

## Requirements

- [x] `ModelViewer` component: branches on `model.format` — GLB via R3F `useGLTF`, SPZ via gaussian-splats-3d `Viewer`
- [x] `<Suspense>` + loading spinner; error state on load failure
- [x] OrbitControls (no auto-rotate), sensible lighting
- [x] Scale-to-fit: drei `<Center>` (bounding-box normalization) for GLB; splats self-center
- [x] Error state when the location has no model — the trigger only renders when `model` exists (section hidden otherwise)
- [x] Draco-compressed GLBs decode via drei (bundled decoder) — pending real-file browser pass
- [x] Off the critical path: `React.lazy` + code-split chunk

## Notes

- Model URLs come from `location.model.filePath` (`/models/...`, nginx-served).
- Grilling round (2026-10-14): modal-only presentation (the sidebar shows a
  "View 3D model" button with a GLB/SPZ label), a single `ModelViewer` that
  branches on `format`, gaussian-splats-3d for SPZ (peer three >=0.160, matches
  0.160.1), orbit-only controls. Escape closes the modal without closing the
  sidebar (same `stopPropagation` fix as the lightbox bug).

## Comments

- 2026-10-14 (agent): Implemented in `frontend/src/components/ModelViewer.tsx`
  (+ `ModelViewerDialog.tsx`, `types/gaussian-splats-3d.d.ts`); `Model.format`
  added to the frontend `Model` type; the sidebar placeholder became a trigger
  button + modal. Verified: `tsc` + `vite build` green (viewer code-split into
  its own 1.14 MB lazy chunk), dev server transforms the modules + resolves
  gaussian-splats-3d (HTTP 200). Pending: interactive browser pass (needs real
  `.glb`/`.spz` files — ticket 02).
