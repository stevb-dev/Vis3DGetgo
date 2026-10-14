# 02 — Resolve endpoint: Delete / Dismiss with soft-delete + notifications

Status: resolved

Replace the `{ status }` body of `PATCH /reports/:id` with a two-action payload
and implement the full resolution behavior. Files: `backend/src/routes/reports.ts`
and `backend/src/lib/schemas.ts`.

## Payload

Update `resolveReportSchema` (currently `{ status: z.enum(['OPEN','RESOLVED']) }`)
to:

```ts
{ action: z.enum(['DELETE', 'DISMISS']), note: z.string().optional() }
```

Keep `authenticate` + `requireAdmin` unchanged.

## Behavior

- **DISMISS**
  1. Update the report: `status: DISMISSED`, `closedAt: new Date()`,
     `note` (if provided).
  2. No content change, no notification.
- **DELETE**
  1. Resolve the target from `report.imageId` or `report.locationId`.
  2. Soft-delete the target:
     - Image report → set `Image.deletedAt = now()`.
     - Location report → set `Location.deletedAt = now()` **and** cascade to all
       child images: `Image.deletedAt = now()` for every image of that location.
  3. Update the acted-on report: `status: RESOLVED`, `closedAt: new Date()`,
     `note` (if provided).
  4. Auto-close sibling OPEN reports on the same target:
     `status: RESOLVED`, `closedAt: new Date()`, no note.
  5. Create a `Notification` for the content owner
     (`Image.userId` / `Location.userId`): `type: MODERATION_REMOVAL`,
     `contentName` = image `originalName` or location `name`,
     `category` = the acted-on report's category, `note` = the provided note.
     Skip if there is no owner (`Location.userId` is null).

Wrap the multi-step work in a transaction so a failure cannot leave a half-applied
state.

## Return

Keep the existing shape `{ report }` (the acted-on report). Other affected rows
are a side effect.

## Acceptance criteria

- `PATCH /reports/:id` with `{ action: 'DISMISS' }` sets `DISMISSED` + `closedAt`,
  touches no content, creates no notification.
- `{ action: 'DELETE' }` on an image report soft-deletes that image, closes
  sibling OPEN reports, and notifies the owner.
- `{ action: 'DELETE' }` on a location report soft-deletes the location and all
  its images, and notifies the owner.
- No owner (null `userId`) → no notification, no error.
- Invalid `action` → `400`; unknown report id → `404` (both unchanged).

## Comments

Resolved 2026-10-14. `PATCH /reports/:id` takes `{ action: DELETE|DISMISS, note? }`. DELETE soft-deletes the target (image, or location + cascade to child images), clears the pinned thumbnail when it's the removed image, auto-closes same-target AND child-image OPEN reports (grilling decision), and notifies only the acted-on target's owner. DISMISS just closes. All multi-step work in one transaction.
