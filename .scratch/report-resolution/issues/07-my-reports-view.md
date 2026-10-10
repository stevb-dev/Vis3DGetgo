# 07 — Reporter "My reports" view

Status: ready-for-agent

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
