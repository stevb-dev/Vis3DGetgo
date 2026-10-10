# 04 — Filter soft-deleted content from public/owner views

Status: ready-for-agent

Every query that returns images or locations to users must exclude rows with
`deletedAt != null`. Because a location delete cascades `deletedAt` to child
images, filtering each entity by its own `deletedAt` is sufficient.

## Scope

Audit and update every backend query and frontend fetch that lists or fetches
images or locations, including:

- Location list / map markers.
- Location detail and its image carousel.
- Location sidebar.
- Any "my locations / my images" views.
- `prisma.image.find*` and `prisma.location.find*` calls — add
  `where: { deletedAt: null }` (or `deletedAt: { equals: null }`).
- Direct get-by-id endpoints should return 404 (or otherwise exclude) content
  whose `deletedAt` is set.

Use `grep` to find all `image.find`, `location.find`, and the frontend query
sites; leave no public path serving soft-deleted content.

## Acceptance criteria

- Soft-deleted images/locations disappear from map markers, carousels, sidebars,
  and lists for admins and regular users alike.
- Soft-deleted content is not retrievable via public endpoints.
- Deleting a location hides its images and 3D model too.
