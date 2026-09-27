# 03: R3F 3D model viewer component

Status: ready-for-agent
Feature: models-3d

## Context

Detail pane shows the location's GLB via React Three Fiber. All deps installed (three 0.160, @react-three/fiber 8, @react-three/drei 9).

## Requirements

- [ ] `ModelViewer` component: `useGLTF(modelPath)`, `<Suspense>` + loading spinner
- [ ] OrbitControls, sensible lighting/Environment, ground shadow optional
- [ ] Scale-to-fit: compute bounding box and normalize
- [ ] Error state when the location has no model ("No 3D model for this location yet")
- [ ] Verify Draco-compressed GLBs decode (drei bundles the decoder)
- [ ] Keep the viewer off the critical path (lazy-load with `React.lazy`)

## Notes

- Model URLs come from `location.model.filePath` (`/models/...`, nginx-served).
