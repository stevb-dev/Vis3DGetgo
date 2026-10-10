# Technology Selection Rationale

Why each technology was selected, and how the pieces correlate.

## Why these technologies were selected

### 1. One language everywhere — TypeScript

The single biggest architectural choice. TypeScript runs in the browser (React), on the server (Node + Express), and at the database layer (Prisma). One language means one mental model, no context-switching, and — critically — **types flow across the whole stack**. A `Location` type defined in Prisma is the same shape Express serves and React consumes. Type safety across a full-stack project is also a defensible thesis argument on its own.

**Node.js** was picked over Python/Django or Java because it matches the frontend language, has the largest ecosystem, and containerizes trivially — which matters for the on-premise requirement.

### 2. The thesis core: geospatial + 3D

- **Leaflet** over MapLibre GL / Mapbox: open-source, no API key, works fully offline (on-premise requirement), ~40 KB vs Mapbox GL's ~800 KB. It only needs to render 2D markers — so the heavy 3D engine is deliberately *not* a map engine.
- **Three.js + React Three Fiber** over Babylon.js: the largest WebGL community, first-class GLB/GLTF support, and R3F gives a declarative React API — the 3D scene becomes a React component tree that can read state from the same stores as the rest of the app.
- **GLB + Draco (gltf-pipeline)**: GLB is the web-native single-file 3D format; Draco compression keeps models small for fast loading.

### 3. Data layer

- **PostgreSQL + PostGIS** over MongoDB: the domain is strictly relational (Location → Model → Images), and PostGIS is the industry standard for spatial queries. `ST_DWithin` with a GiST index is a real thesis-worthy feature — radius search accelerated by an index (verified ~9 ms over 1000 rows with `EXPLAIN ANALYZE`).
- **Prisma**: schema-as-single-source-of-truth, typed client, and migration history — it removes an entire class of SQL/type-mismatch bugs.

### 4. Auth — hand-rolled JWT over Keycloak (ADR-0001)

One SPA + one API with a two-level role split doesn't justify a ~1 GB RAM identity server with its own database. Instead: short-lived JWT access token (stateless verification — no DB hit per request, which matters for a read-heavy map API) + opaque rotating refresh token stored hashed in Postgres (real revocation, the thing plain JWT lacks). Supporting cast: **bcrypt** (embedded salt, cost 12), **express-rate-limit** (brute-force), **helmet** (headers), **cookie-parser** (httpOnly refresh cookie).

### 5. Files: local volumes + Nginx over S3/Cloudinary

On-premise means zero external dependencies: no cloud, no egress costs, no internet needed after setup. **Multer** parses the upload, **Sharp** resizes/compresses to WebP server-side, **uuid** guarantees unique filenames, and **Nginx** serves the results at wire speed — much faster than Node ever could.

### 6. Frontend state split

- **TanStack Query** owns *server* state (locations, images — cached, re-fetched, invalidated).
- **Zustand** owns the *tiny* client state (auth session, selected location).
- **Tailwind + shadcn/ui (Radix)** give accessible, consistent UI without a heavy component library.
- **React Router** nested routes are the key map trick: `/locations/:id` renders *inside* the map page, so the Leaflet instance never unmounts.
- **react-hook-form + react-dropzone + sonner**: form handling, drag-and-drop, feedback.

### 7. Docker Compose + Nginx as the glue

The on-premise thesis line *is* the infrastructure: `db` (postgis image) + `api` (Node) + `frontend` (Vite) + `nginx`, wired on one bridge network with three volumes. Reproducible on any university server with one command.

## How the technologies correlate

The stack is a pipeline — each layer feeds the next.

### Read path (map → 3D)

React Query fetches `/api/locations` → Express route → Prisma → **PostGIS** executes the indexed spatial query → JSON → Leaflet renders markers → marker click → React Router nests `/locations/:id` → sidebar detail → R3F's `useGLTF` loads the **GLB** served by **Nginx** from the models volume → WebGL renders it. Types from Prisma's generated client describe every object in that chain.

### Write path (image upload)

react-dropzone → multipart POST → Nginx proxies `/api` → **Multer** buffers → **Sharp** converts to WebP → **uuid** filename → saved to the Docker volume → Prisma inserts the `Image` row → Nginx serves it back → carousel renders it. The same volume is mounted in both the API container (write) and the Nginx container (read) — that's the correlation Docker makes possible.

### Auth slice threading through everything

Zustand holds the access token → API client attaches `Bearer` → Express middleware verifies statelessly with **jsonwebtoken** → on 401 the client calls `/refresh` → httpOnly cookie → Prisma hash lookup → rotation. The same **Zod** schemas validate a request on the client (react-hook-form) *and* on the server — one validation contract, two ends.

### The deliberate split that ties it together

Leaflet does 2D (context, navigation, ~40 KB), Three.js does 3D (a WebGL canvas in the sidebar). Neither competes with the other; R3F is the bridge that lets React state (selection from Zustand/Query) drive the 3D scene. Similarly, PostGIS does spatial math in the DB where the index lives, and Prisma translates results into types — each tool does the one thing it's best at, and TypeScript is the common language they all speak.

The meta-theme behind every choice: each technology is an **engineering trade-off that can be defended** — Leaflet vs MapLibre, Three.js vs Babylon, PostGIS vs MongoDB, JWT vs Keycloak, volume+Nginx vs S3 (see `THESIS_TECH_STACK.md` §13 and the ADRs).

## Related

- `docs/used-technologies.md` — short descriptions of everything used
- `THESIS_TECH_STACK.md` — full stack document with defense talking points
- `docs/adr/0001-auth-jwt-over-keycloak.md` — auth decision record
- `docs/adr/0002-map-interaction-design.md` — map UX decision record
