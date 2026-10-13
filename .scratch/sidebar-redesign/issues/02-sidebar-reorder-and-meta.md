# 02: Sidebar reorder & meta trim

Status: resolved
Feature: sidebar-redesign
Blocked by: 01

## Context

Reorder LocationSidebar.tsx and trim the meta block to badge + category.
Description becomes a subtitle under the title with a 2-line clamp + "Show more".

## Requirements

- [x] Order: header (title + subtitle + actions) → meta (badge + category) → Images → 3D model
- [x] Meta block shows only the seeded/user-created badge + category label (drop coords/timestamps/image count)
- [x] Description as subtitle beneath the title, line-clamp-2 + "Show more"/"Show less" when longer than 2 lines
- [x] Images: carousel above the dropzone
- [x] 3D model: tall hero block (~320–400px), section hidden entirely when loc.model is null
- [x] Edit form gains a category select alongside name/description

## Notes

- Keep the 3D section as the existing placeholder box (real ModelViewer is models-3d/03), just enlarged.

## Comments

- 2026-10-13 (agent): Rewrote `LocationSidebar.tsx` to the new order — sticky header (title + clamped description subtitle + Save/Share/Edit/Delete/Report/Close actions) → meta (badge + category label) → Images (carousel above dropzone) → 3D model (`min-h-[320px]`, hidden when `loc.model` is null). Description is a `ClampedText` component measuring `scrollHeight > clientHeight` for the Show more/less toggle. Edit form gained a category `<select>` (new `ui/select.tsx` native select). Verified by frontend build.
