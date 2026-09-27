# Issue Tracker Overview

Local-markdown tracker. Conventions: `docs/agents/issue-tracker.md`; statuses: `docs/agents/triage-labels.md`. One directory per feature: `spec.md` + numbered tickets under `issues/`.

## Features & state

| Feature | Spec | Resolved / total | Notes |
|---|---|---|---|
| `auth` | [spec](auth/spec.md) | 5 / 5 | Full JWT auth end-to-end (see ADR-0001) |
| `infra` | [spec](infra/spec.md) | 3 / 3 | Docker, nginx, healthchecks, backups |
| `locations` | [spec](locations/spec.md) | 4 / 4 | CRUD + PostGIS nearby (geography GIST index) + edit/delete permission model |
| `frontend-map` | [spec](frontend-map/spec.md) | 2 / 4 | 01 markers (resolved), 04 locate button (resolved); 02/03 partial — see comments |
| `images` | [spec](images/spec.md) | 0 / 4 | Open — upload pipeline + carousel |
| `models-3d` | [spec](models-3d/spec.md) | 0 / 3 | Open — 02 needs a human to source demo GLBs |
| `deployment` | [spec](deployment/spec.md) | 0 / 2 | Open — prod runbook, backup rotation docs |

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
