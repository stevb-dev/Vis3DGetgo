# 02: Carousel ordering API

Status: ready-for-agent
Feature: images

## Context

Images are ordered by the `order` column (asc). Upload sets `order = max + 1`. Reordering has no endpoint yet.

## Requirements

- [ ] Decide scope: (a) creation-order only, or (b) reorder endpoint `PATCH /api/images/:id/order` (owner/admin) with a new position
- [ ] If (b): validate position range, shift siblings atomically (transaction), keep invariant "orders are contiguous per location"
- [ ] `GET /api/locations/:id` already returns images ordered asc — confirm and add a test

## Notes

- Prefer minimal scope for the thesis; (b) is a nice differentiator if time allows.
