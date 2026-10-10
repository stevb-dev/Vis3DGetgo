# 06 — Admin unread badge on the Reports link

Status: ready-for-agent

Surface new OPEN reports to admins via an unread badge on the header "Reports"
link. The count is OPEN reports with `createdAt > currentUser.lastSeenReportsAt`.

## Backend

- Expose `lastSeenReportsAt` on the authenticated user (`/api/auth/me` or
  equivalent) so the frontend can compute the cutoff.
- Add an admin endpoint for the unread count, e.g.
  `GET /reports/unread-count` → `{ count }` = number of OPEN reports with
  `createdAt > lastSeenReportsAt`.
- Add an endpoint to mark reports seen, e.g. `POST /reports/seen` (admin), which
  sets `User.lastSeenReportsAt = now()`. Choose one consistent naming/approach
  and keep `requireAdmin` on both.

## Frontend

- In `frontend/src/components/Header.tsx`, show the badge on the Reports link
  (admin only), hidden when the count is 0.
- When the admin opens `/admin/reports`, call the seen endpoint to reset
  `lastSeenReportsAt` (clear the badge).

## Acceptance criteria

- Header Reports link shows a badge with the unread OPEN count (hidden when 0).
- Visiting `/admin/reports` clears the badge.
- Only admins see the badge.
