-- Geography-cast functional GIST index.
-- The radius query in GET /api/locations/nearby uses
-- ST_DWithin(geography, geography, radius); the geometry index from the
-- initial migration does not apply to geography queries, so we add the
-- matching index here.
CREATE INDEX idx_location_coords_geography ON "Location"
  USING GIST ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography));
