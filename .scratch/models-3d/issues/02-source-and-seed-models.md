# 02: Source and seed demo models

Status: resolved
Feature: models-3d

## Context

The app needs demo models (one per seeded location) — GLB meshes and/or SPZ
Gaussian splats — to make the viewer demonstrable. Content choice is a human
decision (licensing, aesthetics).

## Requirements

- [x] Pick 3 CC-licensed demo models (2 GLB + 1 SPZ); leave Kale Fortress empty
- [x] GLB: source ready GLBs (marble bust + stone bridge, obj→glb for the bridge)
- [x] SPZ: source a `.spz` (Niantic's official `racoonfamily.spz` sample)
- [x] Keep each ≤50MB; place into `backend/models/`
- [x] Register them in the DB via the seed script (Prisma), setting `Model.format`

## What was sourced (2026-10-14)

| Location | File | Format | Size | License / source |
|---|---|---|---|---|
| Macedonia Square | `marble-bust.glb` | GLB | 1.9 MB | CC0 — Poly Haven "Marble Bust 01" (by Rico Cilliers), via Innerscene parts library |
| Stone Bridge | `stone-bridge.glb` | GLB | 0.8 MB | CC0 — "Stone bridge 2" by Paul Wortmann (OpenGameArt) |
| Matka Canyon | `racoonfamily.spz` | SPZ | 24 MB | MIT — Niantic's official `spz` format sample |
| Skopje Fortress (Kale) | — | — | — | deliberately left empty (demonstrates the "no model" state) |

## Grilling decisions (locked, 2026-10-14)

- **Scope**: 3 models (2 GLB + 1 SPZ), one location left empty — the empty slot
  showcases the sidebar's "no 3D model" state.
- **Format → location**: SPZ on Matka (natural scene), GLB on the two monuments;
  Kale Fortress is the empty slot.
- **Fidelity**: representative stand-ins, not faithful Skopje geometry
  (Skopje-specific CC models don't exist); labelled as illustrative.
- **License**: CC0 + CC-BY only.
- **Registration**: the **seed script owns the demo models** (upsert + prune,
  mirroring the location seed) — not the admin upload endpoint.
- **Placement**: files live in `backend/models/` (gitignored), bind-mounted into
  the API/nginx containers (replacing the `models` named volume).
- **The SPZ landscape reality**: no small, ready `.spz` landscape is directly
  downloadable — a real landscape splat is 100s of MB and SuperSplat downloads are
  auth-gated. Shipped Niantic's `racoonfamily.spz` as a working placeholder; a
  landscape swap remains a known follow-up.

## Non-obvious implementation points

- The `models` volume previously collided with the baked embedding model at
  `/app/models/embedding`. A bind-mount at `/app/models` would have shadowed it,
  so the embedding model moved to `/app/embedding` (Dockerfile.dev + Dockerfile,
  `env.localModelPath`). Search verified unaffected (0.82 "castle" → Kale).
- The bridge ships as `.blend` + `.obj` with **no `.mtl`**. A minimal MTL
  (`newmtl None` → `map_Kd stone_bridge_2_001_d.png`) was authored so
  `obj2gltf` bakes the stone texture into the GLB.
- The seed reads each model's size from `config.modelsDir` and skips a demo model
  whose file is missing (a fresh clone without `backend/models/` still boots).

## Comments

- 2026-10-14 (agent): Sourced + seeded. See above. Files are out of git; re-seed
  by dropping them into `backend/models/` and running
  `docker compose exec api npx tsx prisma/seed.ts`.
