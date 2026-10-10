# Report Resolution (Admin)

Spec for the admin "resolve a report" flow. Today the Resolve button only flips
a report's `status` to `RESOLVED` and moves it to the Resolved tab; nothing
happens to the reported content and nobody is notified.

This feature replaces that with a two-action resolution workflow: the admin can
**Delete** the reported content (soft-delete) or **Dismiss** the report, while
the reporter and the content owner are kept informed in-app.

## Goals

- Give the admin a meaningful, two-way decision on each report (Delete vs Dismiss).
- Record what happened: status + optional admin note + a single close timestamp.
- Soft-delete offending content — never a hard delete, so the report record and
  audit trail survive and files stay on disk.
- Tell the reporter the outcome, and tell the content owner when their content
  is removed.
- Surface new reports to admins via an unread badge.

## Non-goals

- No hard deletion of content or of files on disk.
- No restore / reopen: reports are one-way, and soft-deleted content is permanent.
- No email; all feedback is in-app.
- No unread/badge for the reporter — "My reports" is a plain list.

## Decisions (locked)

- `ReportStatus` becomes `OPEN | RESOLVED | DISMISSED`.
  - `RESOLVED` = the reported content was deleted.
  - `DISMISSED` = the report was closed with no action.
- Report closing timestamp: rename `Report.resolvedAt` → `closedAt`, set for both
  closing actions.
- `Report.note` (optional free text): shown to the reporter on dismiss, to the
  content owner on delete.
- Soft-delete via a `deletedAt` timestamp on `Image` and `Location`. Deleting a
  location cascades `deletedAt` to its child images.
- Delete auto-closes sibling OPEN reports on the same target (`RESOLVED`,
  `closedAt` = now, no note). Dismiss is per-report only.
- Owner notification: bell + unread badge, snapshot-based (content name +
  category + note), never the reporter's identity. Mark-all-read on opening the
  panel.
- Admin unread badge: OPEN reports created after `User.lastSeenReportsAt`;
  cleared when the admin opens `/admin/reports`.
- Report list tabs: **Open** (`OPEN`) and **Closed** (`RESOLVED` + `DISMISSED`,
  each row labeled).
- Reporter feedback: a "My reports" plain list showing status and the dismiss
  note; no unread marker.

## Affected areas

- Backend: Prisma schema + migration, `backend/src/routes/reports.ts`,
  `backend/src/lib/schemas.ts`, hidden-content filtering across image/location
  queries, and a notifications + my-reports endpoint.
- Frontend: `frontend/src/pages/AdminReportsPage.tsx`, a new "My reports" page,
  the header (admin badge + notification bell + my-reports link), and
  `frontend/src/lib/types.ts`.

## Tickets

See `issues/01-schema-migration.md` through `issues/08-owner-notifications.md`.
