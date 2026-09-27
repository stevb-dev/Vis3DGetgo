# frontend-map — spec

Leaflet map with markers for all locations, click → detail split pane, selected-location state in Zustand synced to the URL (`/locations/:id`).

## Endpoints used

- `GET /api/locations` (list for markers)
- `GET /api/locations/:id` (detail)
- `GET /api/locations/nearby` (future)

## Tickets

- `01-leaflet-map-with-markers.md`
- `02-location-detail-split-pane.md`
- `03-map-state-and-routing.md`
- `04-locate-me-button.md`
