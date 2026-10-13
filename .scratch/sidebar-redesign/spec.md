# sidebar-redesign — spec

Redesign the location sidebar: reorder sections, trim the meta block, add a
location category, a Save/bookmark feature (with a /saved page), and a Share
button backed by a human-readable name@lat,lng slug URL.

## Decisions (grilling round, 2026-10-11)

- Order: Meta (badge + category) → Images (carousel → dropzone) → 3D model (tall hero, hidden when absent)
- Description → subtitle under the title, 2-line clamp + "Show more"
- Header: keep Edit/Delete/Report/Close; add Save + Share
- Category: 11-value enum (see 01), required on create, editable, backfill MONUMENTS
- Save: per-user SavedLocation; guests get a log-in prompt; /saved card list
- Share: copy slug /locations/<name>/@<lat>,<lng>; :id stays canonical; slug resolves coords → redirect to :id

## Decisions (grilling round, 2026-10-13)

- Category taxonomy: add a **NATURE** value (11 total) so Matka Canyon is honestly labeled; future parks/outdoors fit. Seed assignments: Macedonia Square / Skopje Fortress / Stone Bridge → MONUMENTS, Matka Canyon → NATURE.
- Bookmark saved-state: `GET /api/locations/:id/save` → `{ saved }` (read), `POST /api/locations/:id/save` → toggle (returns new `{ saved }`), `GET /api/saved/locations` → list. All auth-required.
- Fly-to: /saved cards and share links land on `/locations/:id?fly=1`; the map centers on the location on external entry only (marker-click behavior unchanged).
- Share resolve: nearest location within ~25 m (ST_DWithin + distance-ordered), 404 when none; truncation is ≤ ~1 m so 25 m is ample headroom without ambiguity.

## Tickets

- 01-location-category-enum.md
- 02-sidebar-reorder-and-meta.md
- 03-save-bookmark-and-saved-page.md
- 04-share-and-slug-url.md
