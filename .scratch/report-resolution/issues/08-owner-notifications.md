# 08 — Owner notifications (bell + unread badge)

Status: resolved

Notification bell for content owners when their content is removed by moderation.
Uses the `Notification` model created in ticket 01.

## Backend

- `GET /notifications` (authenticated) → the user's notifications:
  `id`, `type`, `contentName`, `category`, `note`, `readAt`, `createdAt`.
- `POST /notifications/read-all` (authenticated) → set `readAt = now()` on all of
  the user's unread notifications.
- Expose the unread count (e.g. via `/notifications/unread-count` or the `me`
  response).

## Frontend

- Bell in `frontend/src/components/Header.tsx` for all logged-in users, with an
  unread badge (hidden when 0).
- Opening the panel lists notifications and marks all read (clears the badge).
- Notification rendering (no reporter identity):
  `Your image "<contentName>" was removed — <category label><: note>`.

## Acceptance criteria

- Owner sees a bell with an unread count when their content is removed.
- Opening the panel shows the removal notice(s) and clears the badge.
- Notice shows content name + category + optional note; no reporter identity.
- Users with no notifications see an empty state.

## Comments

Resolved 2026-10-14. `GET /notifications` + `POST /notifications/read-all` + `GET /notifications/unread-count` (new `routes/notifications.ts`). `NotificationBell.tsx` dropdown in the header with an unread badge; opening marks all read. Copy is generic ("Your content … was removed") since the snapshot model carries no image/location kind discriminator.
