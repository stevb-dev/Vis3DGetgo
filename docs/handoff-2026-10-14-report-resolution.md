# Handoff — report-resolution (2026-10-14)

Session context for the next agent. The `report-resolution` feature (8/8 tickets) landed this session — two-action admin moderation with soft-delete, owner notifications, an unread badge, and "My reports". **Everything is committed; working tree clean** (migration already applied to the live stack).

## What landed

1. **Schema + migration** (`20261014010000_report_resolution`): `ReportStatus` + `DISMISSED`, `resolvedAt`→`closedAt`, `Report.note`, `Image.deletedAt` / `Location.deletedAt`, `User.lastSeenReportsAt`, `Notification` + `NotificationType`.
2. **Resolve endpoint** (`routes/reports.ts`): `PATCH /reports/:id` `{ action: DELETE|DISMISS, note? }`.
3. **List filter**: `GET /reports?status=OPEN|CLOSED`.
4. **Soft-delete filtering** across every image/location read + write path.
5. **Admin UI** (`AdminReportsPage.tsx`): dropdown + confirm dialog + Open/Closed tabs.
6. **Admin unread badge** (`Header.tsx` + `GET /reports/unread-count` + `POST /reports/seen`).
7. **My reports** (`/my-reports` page + `GET /my-reports`).
8. **Notifications** (`routes/notifications.ts` + `NotificationBell.tsx`).

## Grilling decisions (locked, don't re-litigate)

- Child-image OPEN reports **auto-close** on a location delete, but their owners are **not** notified — only the acted-on target's owner is.
- Soft-delete **clears the pinned thumbnail** (`thumbnailImageId = null`) when the removed image is pinned — this is what keeps the `thumbnailImage` to-one relation safe (no `deletedAt` filter needed on it).
- Badge counts via **dedicated endpoints** (`/reports/unread-count`, `/notifications/unread-count`) — `lastSeenReportsAt` is *not* exposed to the client; the count endpoint computes the cutoff server-side.
- `seen` fires **only when the Open tab is active** (`useEffect([status])`), not on page mount of either tab.

## Non-obvious implementation points

- **`resolveReportSchema`**: `{ action: z.enum(['DELETE','DISMISS']), note: z.string().trim().max(500).optional() }`. The handler stores `note ?? null`; the frontend sends `note || undefined`.
- **DELETE transaction** loads `existing` (report + `image`/`location` full rows) *outside* the transaction, then runs the multi-step work inside `prisma.$transaction`. P2025 (concurrent delete) still maps to 404 at the handler level.
- **Notification copy is generic** ("Your content … was removed") because the snapshot `Notification` model has no image/location kind discriminator — the spec's `Your image "<name>"` example can't be rendered faithfully without a `kind` field. Flagged in ticket 08's comment; add a kind enum if copy matters.
- **`deletedAt` filtering** spans raw SQL too: `nearby`, `resolve`, `search` each gained `AND l."deletedAt" IS NULL`; the search backfill skips deleted rows. The filtered count is `_count: { select: { images: { where: { deletedAt: null } } } }`.
- **Write paths 404 on soft-deleted targets**: report, upload, save, thumbnail-pin, edit, delete all use `findFirst({ where: { id, deletedAt: null } })`.
- **Reports list does NOT filter soft-deleted targets** (it's the moderation view — admins need the context). `AdminReport.image.location` select now carries `deletedAt` so the UI can hide the "Open location" link for deleted targets.
- **Header**: order is Reports (admin, badge) → My reports → New location → Saved → bell → username → logout. The bell (`NotificationBell`) and admin badge are separate react-query keys: `['reports','unread-count']` and `['notifications','unread-count']` / `['notifications']`.
- **No new dependencies** — the "dropdown" is a hand-rolled `<div>` menu (fixed backdrop for click-outside), since `@radix-ui/react-dropdown-menu` isn't installed (adding it would mean a frontend rebuild).

## Migration & how it was applied

- Schema edited → `npx prisma validate` + `npx prisma generate` (local) → `npx prisma migrate deploy` against `localhost:5432` → **regenerated the client inside the container** (`docker compose exec api npx prisma generate`) → `docker compose restart api`.
- `ALTER TYPE "ReportStatus" ADD VALUE 'DISMISSED'` is safe in PG16 (no value use in the same transaction).

## Verification state

- **Backend**: 64 unit tests green (5 new `resolveReportSchema`); `tsc --noEmit` green.
- **Live HTTP E2E** (21 checks, all green, then cleaned up): DELETE (soft-delete 404 + list absence + sibling & child-image auto-close + owner notification + unread/read-all), DISMISS (stays live + reporter note), invalid action 400, report-on-deleted 404.
- **Frontend**: `tsc` + `vite build` green. **Pending: interactive browser pass** (report-resolution added to the list).

## Remaining work (unchanged)

- `models-3d` (0/3) — 02 needs a human to source demo GLBs.
- `frontend-map` 02/03 partial, 05 marker icons.
- `deployment` (0/2) — prod runbook + backup docs.
- Interactive browser pass (7 features now).

## Suggested skills

- `code-review` after this chunk; `grilling` (already run — decisions above are locked); `diagnosing-bugs` if the soft-delete filtering or badge counts regress.
