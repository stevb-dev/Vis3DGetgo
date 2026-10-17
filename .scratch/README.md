# Issue Tracker Overview

Local-markdown tracker. Conventions: `docs/agents/issue-tracker.md`; statuses: `docs/agents/triage-labels.md`. One directory per feature: `spec.md` + numbered tickets under `issues/`.

## Features & state

| Feature | Spec | Resolved / total | Notes |
|---|---|---|---|
| `auth` | [spec](auth/spec.md) | 5 / 5 | Full JWT auth end-to-end (see ADR-0001) |
| `infra` | [spec](infra/spec.md) | 3 / 3 | Docker, nginx, healthchecks, backups |
| `locations` | [spec](locations/spec.md) | 4 / 4 | CRUD + PostGIS nearby (geography GIST index) + edit/delete permission model |
| `create-location-flow` | [spec](create-location-flow/spec.md) | 0 / 3 | Nest create route under the map (viewport preserved), side-panel form, cancel + discard confirm — grilling done 2026-10-15 |
| `frontend-map` | [spec](frontend-map/spec.md) | 2 / 5 | 01 markers (resolved), 04 locate button (resolved); 02/03 partial; 05 future TODO (needs-info) |
| `images` | [spec](images/spec.md) | 4 / 4 | Upload pipeline + carousel + delete + reports + admin thumbnail pinning |
| `report-resolution` | [spec](report-resolution/spec.md) | 8 / 8 | Two-action admin resolution (Delete/Dismiss) + soft-delete + notifications + My reports — implemented 2026-10-14 |
| `models-3d` | [spec](models-3d/spec.md) | 3 / 3 | Admin API + viewer + demo models seeded (2 GLB + 1 SPZ placeholder) — implemented 2026-10-14 |
| `deployment` | [spec](deployment/spec.md) | 0 / 2 | Open — prod runbook, backup rotation docs |
| `search` | [spec](search/spec.md) | 6 / 6 | Semantic location search (local embeddings + pgvector) — implemented 2026-10-14 |
| `sidebar-redesign` | [spec](sidebar-redesign/spec.md) | 4 / 4 | Sidebar reorder + category (11-value enum) + save/bookmark + share/slug — implemented 2026-10-13 |
| `tile-layers` | [spec](tile-layers/spec.md) | 5 / 5 | Key-free tile-layer switcher (OpenFreeMap Liberty/Bright/Dark + OpenTopoMap) — implemented 2026-10-13 |
| `map-filters` | [spec](map-filters/spec.md) | 4 / 4 | Category filter (chips, `?category=`) + zoom declutter — implemented 2026-10-13 |

## Current implementation state

See `docs/implementation-status.md` — full build log, verification evidence, and the bug ledger.

## Ticket file anatomy

```markdown
# NN: Title

Status: ready-for-agent          # needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix | resolved
Feature: <slug>
Blocked by: NN (, NN)            # ticket numbers, optional

## Context / Requirements / Notes

## Comments                     # appended history
```
