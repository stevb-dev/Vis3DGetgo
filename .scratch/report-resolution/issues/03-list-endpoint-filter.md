# 03 — Report list endpoint: OPEN / CLOSED filter

Status: ready-for-agent

Extend `GET /reports` to filter by `OPEN` or `CLOSED` (CLOSED = RESOLVED +
DISMISSED). File: `backend/src/routes/reports.ts`.

## Behavior

- `?status=OPEN` → `where: { status: 'OPEN' }`.
- `?status=CLOSED` → `where: { status: { in: ['RESOLVED', 'DISMISSED'] } }`.
- Default / unrecognized value → fall back to `OPEN` (preserve current behavior).
- Keep `orderBy: { createdAt: 'asc' }` and the existing `include`
  (`image`, `location`, `reporter`).

## Response

Ensure each report carries the new fields so the UI can render closed rows:
`status`, `closedAt`, `note` (in addition to the existing fields).

## Acceptance criteria

- `?status=CLOSED` returns both `RESOLVED` and `DISMISSED` reports.
- `?status=OPEN` and no/invalid status return only `OPEN`.
- `closedAt` and `note` are present in the response.
