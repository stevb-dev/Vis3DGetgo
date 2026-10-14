# 05 — Admin reports page: Delete/Dismiss dropdown + Open/Closed tabs

Status: resolved

Rework `frontend/src/pages/AdminReportsPage.tsx` to expose the two-action
resolution workflow and the three-status list.

## Changes

- Replace the single Resolve button with a dropdown offering two actions per OPEN
  report:
  - **Delete content** → shows a confirmation dialog (permanent, cascades),
    then commits `action: 'DELETE'` with an optional note.
  - **Dismiss** → optionally collect a note, then commits `action: 'DISMISS'`.
- Replace the `OPEN` / `RESOLVED` toggle with two tabs: **Open** and **Closed**.
  - Open → `?status=OPEN`.
  - Closed → `?status=CLOSED`, rendering both `RESOLVED` and `DISMISSED` rows,
    each labeled (e.g. "Resolved" / "Dismissed") and showing `closedAt`.
- Update the mutation to call `PATCH /reports/:id` with `{ action, note }`
  (replacing the current `{ status: 'RESOLVED' }`).
- Keep the existing React Query invalidation of `['reports']` and toast feedback.
- Update `frontend/src/lib/types.ts` (`AdminReport`) for the new fields:
  `status: 'OPEN' | 'RESOLVED' | 'DISMISSED'`, `closedAt`, `note`.

## Acceptance criteria

- Dropdown on each OPEN report offers "Delete content" and "Dismiss".
- Delete opens a confirmation dialog before committing.
- An optional note can be entered for both actions.
- Tabs: Open / Closed; the Closed tab shows resolved and dismissed rows, labeled,
  with their `closedAt`.
- Success/error toasts behave as today.

## Comments

Resolved 2026-10-14. `AdminReportsPage.tsx` reworked: per-report dropdown (Delete content / Dismiss), confirm dialog with optional note, Open/Closed tabs via `?status=`, closed rows labeled Resolved/Dismissed with `closedAt`. "Open location" hidden for soft-deleted targets.
