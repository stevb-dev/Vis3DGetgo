# 07 — Reporter "My reports" view

Status: resolved

A plain list of the current user's own reports with their outcome. No unread
marker.

## Backend

- Add `GET /my-reports` (authenticated, any role) returning the user's reports:
  `category`, `status`, `closedAt`, `note`, `createdAt`, and enough to render the
  target (image `originalName`/`filePath`, or location `name`).

## Frontend

- New page + route (e.g. `/my-reports`), guarded to logged-in users.
- Header link visible to logged-in users.
- Render each report: category label, target name, submission date, and status
  (`Open` / `Resolved` / `Dismissed`); show the admin's note for dismissed
  reports.

## Acceptance criteria

- A logged-in user can view their own reports (and only their own).
- Status shows Open/Resolved/Dismissed.
- Dismissed reports display the admin's note; resolved reports reflect the
  content-deleted outcome.

## Comments

Resolved 2026-10-14. `GET /my-reports` (authenticated) + `MyReportsPage.tsx` (`/my-reports`, ProtectedRoute) + header link for all logged-in users. Renders category, target name, submission date, status (Open/Resolved/Dismissed), and the dismiss note.
