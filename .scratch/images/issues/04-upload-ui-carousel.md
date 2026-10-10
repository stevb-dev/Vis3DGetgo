# 04: Upload UI + carousel

Status: resolved
Feature: images

Blocked by: 02 (frontend-map)

## Context

Detail pane needs a dropzone and a carousel. Dependencies installed: react-dropzone, shadcn/ui preconfigured (Carousel via `npx shadcn add carousel` or embla).

## Requirements

- [x] Dropzone panel (authenticated only; prompt login otherwise) → `POST /api/locations/:id/images` (FormData)
- [x] TanStack Query mutation; invalidate the location query on success
- [x] Carousel of location images: lazy `<img loading="lazy">`, thumbnails if available, ordering by `order`
- [x] Delete button on own images (+ all images for admin) → `DELETE /api/images/:id`
- [x] Loading/error/empty states

## Notes

- Lives inside the split-pane detail from `.scratch/frontend-map/issues/02-location-detail-split-pane.md`.

## Comments

- 2026-10-10 (agent): Implemented in the sidebar's Images section: `ImageDropzone.tsx` (react-dropzone, guest log-in prompt, client pre-validation, star-per-file thumbnail picker for the creator's initial batch) + `ImageCarousel.tsx` (shadcn/embla carousel, lazy images — the WebP files ARE the optimized size, no separate thumbnails). Per-slide actions: delete (own/admin, confirm dialog), report (flag → category dialog), admin pin/unpin thumbnail. Location-level report button in the sidebar header (non-owners). Queries `['location', id]` + `['locations']` invalidated after every mutation. Grilling additions beyond the ticket: reporting (see new `Report` model + `/admin/reports` page) and admin thumbnail pinning. Verified: tsc + vite build green, dev server boots; interactive browser pass still to be done by a human (marker: sidebar, upload, carousel, reports page).
- 2026-10-10 (agent, grilling round): LMB on a carousel photo now opens a full-screen lightbox (`ImageLightbox.tsx`): Radix Dialog reusing the embla Carousel (`startIndex` = clicked slide), caption `n / total · location name` (no pinned chip, per decision), click-to-toggle zoom (fit ↔ 2× fit), drag-to-pan with edge clamping while zoomed, navigation resets the view, Escape closes the lightbox before the sidebar. Transient state, no URL param.
