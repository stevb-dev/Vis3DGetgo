# search — spec

Semantic location search: find locations by *meaning* (not exact keyword), multilingual (English + Macedonian), from a search box overlaid on the map. Local embeddings + pgvector — no external API, keeping the zero-dependency / on-premise thesis line.

## Decisions (grilling, 2026-10-10)

| # | Decision | Choice |
|---|---|---|
| 1 | Approach | Local embeddings + pgvector (no external embedding API) |
| 2 | Indexed text | `name` + `description`, concatenated |
| 3 | Model | `Xenova/multilingual-e5-small`, 384-dim (XLM-R, ~100 langs incl. MK) |
| 4 | Serving | In-process `@huggingface/transformers` (ONNX) — no Python service |
| 5 | Weights | Baked into the Docker image at build; loaded from local filesystem |
| 6 | Storage | `embedding Unsupported("vector(384)")?` column on `Location` |
| 7 | Re-embed | Synchronous on `POST`/`PATCH`; startup backfill + in-process interval |
| 8 | Failure | Degrade: save row, NULL embedding (unsearchable until backfill) |
| 9 | Ranking | Cosine similarity, top-K with a floor threshold (tuned), "no matches" below floor |
| 10 | UI | Search box overlay (z > 1000) → type-ahead dropdown → select = fly-to + open `/locations/:id` |

**Minor defaults (flag if wrong):** top 8 results; 300ms debounce; min 2 chars; empty query → no results; one model instance warmed at API startup (singleton, reused for write- and query-embedding); backfill interval ~10 min; e5 query/passage prefix convention (`query: ` / `passage: `); similarity floor default `0.4` (tuned against real data).

## Endpoints

| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/locations/search?q=` | No | planned (cosine `<=>`, top-K + floor, thumbnail-enriched) |

Registered before `/:id` so `search` isn't parsed as an id (same trick as `nearby`).

## Notes

- **pgvector not in the db image**: `postgis/postgis:16-3.4-alpine` does not ship pgvector. `CREATE EXTENSION vector` must succeed before the migration runs — see ticket 01.
- e5 requires the `query:`/`passage:` prefix convention: location text is embedded as `passage: name. description`, user query as `query: <text>`.
- Prisma cannot read/write the `vector` type natively — writes and search both go through `$queryRaw`, with the vector serialized as an array string `[0.1, 0.2, …]` and cast `::vector`.
- Similarity floor is a heuristic (e5 cosine scores cluster high) — tune with the seed landmarks + real queries; verify Macedonian coverage with a quick probe (embed a few MK phrases, eyeball nearest neighbours).

## Tickets

- `01-pgvector-embedding-column.md`
- `02-embedding-service-model.md`
- `03-embed-on-write.md`
- `04-backfill-null-embeddings.md`
- `05-search-endpoint.md`
- `06-search-ui.md`
