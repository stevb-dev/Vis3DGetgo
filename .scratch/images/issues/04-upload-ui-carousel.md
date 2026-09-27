# 04: Upload UI + carousel

Status: ready-for-agent
Feature: images

Blocked by: 02 (frontend-map)

## Context

Detail pane needs a dropzone and a carousel. Dependencies installed: react-dropzone, shadcn/ui preconfigured (Carousel via `npx shadcn add carousel` or embla).

## Requirements

- [ ] Dropzone panel (authenticated only; prompt login otherwise) → `POST /api/locations/:id/images` (FormData)
- [ ] TanStack Query mutation; invalidate the location query on success
- [ ] Carousel of location images: lazy `<img loading="lazy">`, thumbnails if available, ordering by `order`
- [ ] Delete button on own images (+ all images for admin) → `DELETE /api/images/:id`
- [ ] Loading/error/empty states

## Notes

- Lives inside the split-pane detail from `.scratch/frontend-map/issues/02-location-detail-split-pane.md`.
