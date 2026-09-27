# Thesis Project: Geospatial 3D Visualization Platform

## Tech Stack & Infrastructure

> **Scope:** On-premise, Dockerized full-stack web application. Users roam a Leaflet map, click locations to view pre-seeded Three.js 3D models, and upload images to a per-location carousel. Users can also create new map locations.

---

## 1. Executive Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Thesis angle** | CS — Geospatial + 3D Visualization | Every tech choice becomes a defensible engineering trade-off |
| **Scale** | On-premise / Self-hosted | Runs in Docker on university servers or local hardware |
| **Auth** | JWT: access token + rotating refresh token | Users own their uploads; revocation, rotation and roles are thesis-worthy |
| **Locations** | Predefined + User-created | Base demo data plus extensibility; user creation adds domain complexity |
| **Data model** | 1 Location → 1 Model → 1 Carousel | Clean relational schema, simple queries, focused scope |
| **Backend** | Node.js + Express + TypeScript | Unified language with frontend, huge ecosystem, easy Dockerization |
| **Frontend** | React + TypeScript | Component architecture, excellent Three.js integration via R3F |
| **Database** | PostgreSQL + PostGIS | Gold standard for geospatial; spatial queries and indexing are thesis features |
| **File storage** | Docker volume + Nginx | Zero external dependencies; Nginx serves static files at wire speed |
| **3D models** | Pre-seeded GLB/GLTF | Web-native format, Three.js optimized, no runtime conversion needed |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Docker Network                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Nginx     │────│   React     │    │   Node.js       │  │
│  │  (reverse   │    │   Frontend  │    │   Express API   │  │
│  │   proxy +   │    │   (Vite)    │    │   (TypeScript)  │  │
│  │  static     │    └─────────────┘    └────────┬────────┘  │
│  │  server)    │                                 │           │
│  └──────┬──────┘                                 │           │
│         │                                        │           │
│         │         ┌──────────────────────────────┘           │
│         │         │                                          │
│  ┌──────┴────────┴──────┐    ┌─────────────────────────┐    │
│  │   Docker Volume      │    │   PostgreSQL + PostGIS  │    │
│  │   (/uploads, /models)│    │   (locations, users,    │    │
│  │                      │    │    images metadata)      │    │
│  └──────────────────────┘    └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Traffic Flow
1. **Nginx** (port 80/443) receives all requests
2. Static assets (`/models/*`, `/uploads/*`) → served directly from volume
3. API calls (`/api/*`) → proxied to Express backend
4. Frontend (`/*`) → proxied to Vite dev server (dev) or served built files (prod)

---

## 3. Frontend Stack

### Core
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework |
| **TypeScript** | 5.x | Type safety across full stack |
| **Vite** | 5.x | Build tool / dev server |

### Map & 3D
| Technology | Version | Purpose |
|------------|---------|---------|
| **Leaflet** | 1.9.x | Interactive 2D map |
| **React-Leaflet** | 4.x | React bindings for Leaflet |
| **Three.js** | 0.160.x | WebGL 3D rendering |
| **React Three Fiber (R3F)** | 8.x | React renderer for Three.js |
| **Drei** | 9.x | Useful R3F helpers (OrbitControls, Environment, etc.) |

### UI & State
| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Query (React Query)** | 5.x | Server state management, caching, mutations |
| **React Router** | 6.x | Client-side routing |
| **shadcn/ui** | latest | Accessible UI components (dialogs, carousels, forms) |
| **sonner** | 1.x | Toast notifications (locate failures, future upload errors) |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **Zustand** | 4.x | Lightweight global client state (auth, selected location) |

### File Upload
| Technology | Purpose |
|------------|---------|
| **react-dropzone** | Drag-and-drop image upload |

---

## 4. Backend Stack

### Core
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x LTS | Runtime |
| **Express** | 4.x | HTTP server framework |
| **TypeScript** | 5.x | Type safety |
| **tsx** | 4.x | TypeScript execution (dev) |

### Database & ORM
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16.x | Relational database |
| **PostGIS** | 3.4.x | Spatial extensions for PostgreSQL |
| **Prisma ORM** | 5.x | Type-safe database access, migrations, schema management |

### Auth & Security
| Technology | Version | Purpose |
|------------|---------|---------|
| **bcrypt** | 5.x | Password hashing (automatic per-password salt, cost 12) |
| **jsonwebtoken** | 9.x | Access-token signing/verification (refresh tokens are opaque, stored hashed) |
| **cookie-parser** | 1.4.x | Refresh-token cookie parsing |
| **express-rate-limit** | 7.x | Brute-force protection on auth endpoints |
| **zod** | 3.x | Runtime validation for API inputs |
| **helmet** | 7.x | Security headers |
| **cors** | 2.x | Cross-origin handling |

### File Handling
| Technology | Purpose |
|------------|---------|
| **multer** | Multipart form-data parsing (image uploads) |
| **sharp** | Server-side image optimization (resize, WebP conversion) |
| **uuid** | Unique filenames for uploads |

---

## 5. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

model User {
  id            Int            @id @default(autoincrement())
  email         String         @unique
  username      String         @unique
  password      String         // bcrypt hash (per-password salt embedded by bcrypt)
  role          Role           @default(USER)
  createdAt     DateTime       @default(now())
  locations     Location[]
  images        Image[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        Int       @id @default(autoincrement())
  userId    Int
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique // SHA-256 of the opaque token; raw value only ever lives in the httpOnly cookie
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
}

model Location {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  latitude    Float
  longitude   Float
  createdAt   DateTime @default(now())
  
  // Spatial index via PostGIS
  // Raw migration adds: CREATE INDEX idx_location_coords ON "Location" USING GIST (ST_Point(longitude, latitude));
  
  userId      Int?
  user        User?    @relation(fields: [userId], references: [id])
  
  model       Model?
  images      Image[]
}

model Model {
  id          Int      @id @default(autoincrement())
  locationId  Int      @unique
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  filename    String   // e.g., "eiffel-tower.glb"
  filePath    String   // e.g., "/models/eiffel-tower.glb"
  fileSize    Int
  createdAt   DateTime @default(now())
}

model Image {
  id          Int      @id @default(autoincrement())
  locationId  Int
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  
  filename    String   // e.g., "uuid-thumb.webp"
  originalName String
  filePath    String   // e.g., "/uploads/uuid-thumb.webp"
  fileSize    Int
  mimeType    String
  order       Int      @default(0) // carousel ordering
  createdAt   DateTime @default(now())
}
```

### PostGIS Spatial Migration (Manual SQL)
```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add GIST spatial index for fast geo queries
CREATE INDEX idx_location_coords ON "Location" USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
```

---

## 6. Docker Infrastructure

### `docker-compose.yml` (dev — real file, see repo)
```yaml
services:
  db:
    image: postgis/postgis:16-3.4-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-thesis}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-thesis}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks: [thesis-net]

  api:
    build: { context: ./backend, dockerfile: Dockerfile.dev }
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@db:5432/${POSTGRES_DB:-thesis}?schema=public
      JWT_SECRET: ${JWT_SECRET:-dev-only-insecure-secret}
      NODE_ENV: development
      PORT: 3000
      UPLOAD_DIR: /app/uploads
      MODELS_DIR: /app/models
      COOKIE_SECURE: "false"
      CORS_ORIGIN: http://localhost:5173
      MAX_UPLOAD_MB: 5
    volumes:
      - ./backend/src:/app/src     # hot reload (tsx watch)
      - ./backend/prisma:/app/prisma
      - uploads:/app/uploads
      - models:/app/models
    ports:
      - "3000:3000"
    depends_on:
      db: { condition: service_healthy }
    networks: [thesis-net]

  frontend:
    build: { context: ./frontend, dockerfile: Dockerfile.dev }
    environment:
      VITE_API_URL: /api
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - ./frontend/index.html:/app/index.html
      - ./frontend/vite.config.ts:/app/vite.config.ts
      - ./frontend/tailwind.config.js:/app/tailwind.config.js
      - ./frontend/postcss.config.js:/app/postcss.config.js
      - ./frontend/components.json:/app/components.json
      - ./frontend/tsconfig.json:/app/tsconfig.json
      - ./frontend/tsconfig.node.json:/app/tsconfig.node.json
    ports:
      - "5173:5173"
    networks: [thesis-net]

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./nginx/nginx.dev.conf:/etc/nginx/nginx.conf:ro
      - uploads:/var/www/uploads:ro
      - models:/var/www/models:ro
    depends_on: [api, frontend]
    networks: [thesis-net]

volumes: { postgres_data: {}, uploads: {}, models: {} }
networks:
  thesis-net: { driver: bridge }
```

> Production lives in `docker-compose.prod.yml`: the nginx image (`nginx/Dockerfile`) builds the SPA itself, the API runs compiled `dist/` with an entrypoint that waits for the DB → `prisma migrate deploy` → optional seed → start. `JWT_SECRET` is required there (`${JWT_SECRET:?...}` fails fast).

### Nginx Config
```nginx
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    client_max_body_size 10m;   # image uploads

    server {
        listen 80;
        server_name localhost;

        # Static uploads
        location /uploads/ {
            alias /var/www/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Static 3D models
        location /models/ {
            alias /var/www/models/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # API proxy — no trailing slash: the /api prefix is preserved,
        # backend routes mount at /api/*.
        location /api/ {
            proxy_pass http://api:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend (dev: proxy to Vite via nginx.dev.conf; prod: serve built files)
        location / {
            root /var/www/frontend;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

---

## 7. 3D Model Pipeline

### Pre-seeded Models
- **Format:** GLB (binary GLTF) — single file, no external dependencies
- **Optimization:** Run through `gltf-pipeline` for Draco compression
- **Storage:** Mounted Docker volume at `/models/` → served by Nginx
- **Size budget:** Keep models under 5MB each for fast loading

### Recommended GLB Workflow
1. Source models from Sketchfab (CC-licensed) or create in Blender
2. Export as GLB from Blender
3. Compress: `npx gltf-pipeline -i model.glb -o model-compressed.glb --draco.compressionLevel=7`
4. Place in `/models/` volume
5. Seed `Model` table with filename reference

### Three.js Loading (R3F)
```tsx
import { useGLTF } from '@react-three/drei'

function ModelViewer({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath)
  return <primitive object={scene} scale={1} />
}
```

---

## 8. Image Upload & Carousel Pipeline

### Upload Flow
1. User drags/selects images in the sidebar detail view
2. Frontend sends `multipart/form-data` to `POST /api/locations/:id/images`
3. Express + Multer receives file → Sharp resizes + converts to WebP
4. File saved to `/uploads/` volume with UUID filename
5. DB record created in `Image` table

### Sharp Optimization Config
```ts
import sharp from 'sharp'

async function optimizeImage(buffer: Buffer, outputPath: string) {
  await sharp(buffer)
    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outputPath)
}
```

### Carousel Component
- Use `shadcn/ui` Carousel or `embla-carousel-react`
- Lazy-load images with `loading="lazy"`
- Generate thumbnails with Sharp for preview

---

## 9. Authentication Flow

### Design Decision: Hand-rolled JWT over Keycloak

Evaluated: self-hosted Keycloak, OIDC federation with an institutional IdP, Passport.js + sessions, hand-rolled JWT. Full trade-off in `docs/adr/0001-auth-jwt-over-keycloak.md`. Summary: one SPA + one API with a two-level role split does not justify an IAM heavyweight (~1GB RAM JVM, own DB, realm config); the design below is ~150 lines we can defend line by line. Revisit if the university runs an IdP — then consume OIDC (PKCE) as a client, as a stretch goal.

### Token Architecture

- **Access token**: signed JWT (HS256), 15-minute TTL, payload `{ userId, role }`. Held in SPA memory + sessionStorage (tab-scoped, survives F5), sent as `Authorization: Bearer <token>`. Verified statelessly on every request — no DB round-trip.
- **Refresh token**: opaque 256-bit random string (not a JWT). Stored in Postgres as a SHA-256 hash (`RefreshToken` table). Delivered as an `httpOnly + Secure + SameSite=Strict` cookie, path-scoped to `/api/auth` so the browser only ever sends it to auth endpoints.
- **Rotation**: every `/refresh` revokes the presented token and issues a new pair. Presenting an already-revoked token is a theft signal → revoke the user's whole token family.
- **Logout**: revoke the refresh row + clear the cookie. The access token dies naturally within ≤15 minutes (documented trade-off).

### Why split tokens?

A single 7-day JWT has no revocation story: logout is cosmetic and a leaked token is valid for a week. Splitting gives real revocation while keeping per-request verification stateless.

### Why bcrypt (and where the salt lives)

bcrypt generates and embeds a random per-password salt inside the hash itself — the application never touches salts. `bcrypt.compare()` re-reads algorithm, cost and salt from the stored string. Hand-rolling salts (or unsalted hashing) would be strictly less secure; delegating to bcrypt (cost 12) is the standard, correct choice.

### Registration
```
POST /api/auth/register
Body: { email, username, password }
→ Validate with Zod
→ Hash password with bcrypt (cost: 12)
→ Create User record (role: USER)
→ Issue access token + refresh cookie
```

### Login
```
POST /api/auth/login
Body: { email, password }
→ Find user by email, compare with bcrypt
→ Identical "invalid credentials" error for unknown email vs wrong password (no enumeration)
→ Issue access token + refresh cookie
```

### Refresh
```
POST /api/auth/refresh
→ Reads the httpOnly refresh cookie, hashes it, looks it up in the DB
→ Checks revokedAt / expiresAt
→ Rotates: revokes old row, creates new one, sets new cookie
→ Returns a fresh access token
```

### Protected Routes
```ts
// Express middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.slice('Bearer '.length)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = verifyAccessToken(token) // jwt.verify
    req.userId = payload.userId
    req.userRole = payload.role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' })
  next()
}
```

### Frontend Auth State
- Zustand store holds `accessToken` + `user` in **memory + sessionStorage** (tab-scoped; no localStorage — nothing persists across browser restarts except the refresh cookie)
- On app boot, the store restores from sessionStorage instantly (no logged-out flash on F5), then one silent `POST /auth/refresh` rotates the pair via the cookie
- API client attaches the Bearer header; on 401 it performs a single refresh + retry, else logs out
- `ProtectedRoute` guards upload/create-location pages

### Hardening

| Measure | Implementation |
|---------|----------------|
| Brute-force protection | `express-rate-limit` on `/api/auth/*` (10 req/min/IP) |
| No user enumeration | Identical login error for unknown email vs wrong password |
| XSS: long-lived token out of JS | Refresh token in an httpOnly cookie; access token memory/sessionStorage-only (≤15m exposure) |
| CSRF | `SameSite=Strict` + same-host Origin check on cookie-based endpoints (works at any host/port) |
| Token theft detection | Refresh rotation + family revocation on reuse |
| Secret management | `JWT_SECRET` via `.env`, required in production (startup fails without it) |

---

## 10. API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account, issue access token + refresh cookie |
| POST | `/api/auth/login` | Authenticate, issue access token + refresh cookie |
| POST | `/api/auth/refresh` | Rotate refresh token, return fresh access token |
| POST | `/api/auth/logout` | Revoke refresh token, clear cookie |
| GET | `/api/auth/me` | Get current user (requires access token) |

### Locations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | No | List all locations (with coordinates) |
| GET | `/api/locations/:id` | No | Get location details + model + images |
| POST | `/api/locations` | Yes | Create new location (user-generated) |
| PATCH | `/api/locations/:id` | Yes | Edit name/description (coordinates not editable; owner blocked when model or foreign images exist) |
| DELETE | `/api/locations/:id` | Yes | Delete (admin: any; owner: own + no model/foreign images; cascades + file cleanup) |
| GET | `/api/locations/nearby` | No | Query by lat/lng/radius in meters (PostGIS `ST_DWithin` + geography GIST index) |

### Images
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/locations/:id/images` | Yes | Upload image(s) to location |
| DELETE | `/api/images/:id` | Yes (owner) | Delete image |

### Models (Admin/Seed only)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/models` | Admin | Register pre-seeded model |

---

## 11. Development Workflow

### Project Structure
```
thesis-project/
├── backend/
│   ├── src/
│   │   ├── routes/        # auth, locations, images, models
│   │   ├── middleware/    # authenticate, requireAdmin, rate limiter, errors
│   │   ├── lib/           # prisma client, config, token helpers
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/    # committed migrations (incl. PostGIS + GIST index)
│   │   └── seed.ts        # admin user + demo locations (idempotent)
│   ├── scripts/           # entrypoint: wait DB → migrate → seed → start
│   ├── uploads/           # Docker volume mount
│   ├── models/            # Docker volume mount (seeded)
│   ├── Dockerfile / Dockerfile.dev
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # shadcn/ui + ProtectedRoute
│   │   ├── pages/         # map, login, register, location detail
│   │   ├── stores/        # zustand auth store
│   │   ├── lib/           # api client (401 → refresh → retry), cn()
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── Dockerfile.dev
│   └── package.json
├── nginx/
│   ├── nginx.conf         # prod (serves built SPA)
│   ├── nginx.dev.conf     # dev (proxies to Vite, HMR-aware)
│   └── Dockerfile         # multi-stage: build SPA → serve it
├── .scratch/              # issue tracker (per feature: spec + issues)
├── docs/                  # agent docs + ADRs
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

### Dev Commands
```bash
# Start everything
docker-compose up -d

# Run migrations
docker-compose exec api npx prisma migrate dev

# Seed data
docker-compose exec api npx tsx prisma/seed.ts

# View logs
docker-compose logs -f api
```

---

## 12. Deployment Guide (On-Premise)

### Prerequisites
- Docker + Docker Compose installed
- At least 4GB RAM available
- Ports 80 (and optionally 443) free

### Steps
1. **Clone repo** on target server
2. **Create `.env`** from `.env.example`
3. **Place seeded models** in `backend/models/`
4. **Build & start:** `docker-compose -f docker-compose.prod.yml up -d --build`
5. **Run migrations:** `docker-compose exec api npx prisma migrate deploy`
6. **Seed database:** `docker-compose exec api npx tsx prisma/seed.ts`
7. **Verify:** Open `http://<server-ip>`

### Backup Strategy
Bundled scripts (rotation included, run from a Linux shell against the prod stack):
```bash
bash scripts/backup.sh               # pg_dump + tar of uploads/models → ./backups/, keeps last 7
bash scripts/restore.sh backups/<stamp>   # restore DB + files from a backup
```

Manual equivalents:
```bash
# Database
docker-compose exec db pg_dump -U postgres thesis > backup_$(date +%F).sql

# Uploads & models
tar czvf backup_files_$(date +%F).tar.gz ./backend/uploads ./backend/models
```

---

## 13. Thesis Defense Talking Points

### Why Leaflet over MapLibre/Mapbox?
- Open-source, no API key, works offline (on-premise requirement)
- Lightweight bundle (~40KB vs Mapbox GL's ~800KB)
- Sufficient for 2D marker-based interaction; 3D is handled by Three.js

### Why Three.js + R3F over Babylon.js?
- Largest community, most tutorials/examples
- React Three Fiber provides declarative React paradigm
- GLB/GLTF first-class support

### Why PostgreSQL + PostGIS over MongoDB?
- Relational integrity (Location → Model → Images)
- PostGIS is the industry standard for spatial queries
- `ST_DWithin` for radius search is a thesis-worthy feature demo
- Functional GIST index on the geography cast makes radius queries index-accelerated — verified with `EXPLAIN ANALYZE` (Index Scan, ~9ms over 1000 rows)

### Why Local Volume + Nginx over S3/Cloudinary?
- Zero external dependencies — critical for on-premise deployment
- No egress costs, no internet requirement after initial setup
- Nginx serves static files faster than Node.js

### Why JWT (access + refresh) over plain sessions?
- Access verification is stateless — no session lookup per request
- DB-backed rotating refresh tokens add real revocation, the thing plain JWT lacks
- Hybrid (stateless read path + stateful refresh) is the production-standard pattern
- Cookie transport keeps the long-lived credential out of JavaScript

### Why not Keycloak (or any self-hosted IdP)?
- Keycloak solves SSO/federation across many apps; this is one SPA + one API with a user/admin split
- ~1GB RAM JVM + its own database vs. the whole stack fitting in 4GB
- Realm/client/mapper configuration would dominate the thesis narrative and dev time
- Contradicts the "zero external dependencies" on-premise thesis line
- Revisit as a stretch goal: if the university runs an IdP, consume OIDC (PKCE) as a client — don't host your own

---

## 14. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large 3D models slow loading | Draco compression + loading spinner + LOD fallback |
| Too many images slow carousel | Pagination (10 per page) + lazy loading + Sharp thumbnails |
| Docker volume fills up | Image size limits (5MB), file count quotas, cleanup cron |
| PostGIS too complex | Start with raw lat/lng floats; add PostGIS as "optimization chapter" |
| User-created locations are spam | Optional: admin approval queue, rate limiting per user |

---

## 15. Stretch Goals (If Time Permits)

1. **WebXR / VR Mode:** View 3D models in VR using Three.js WebXRManager
2. **Real-time Collaboration:** WebSockets for "users viewing this location now"
3. **3D Model Upload:** Let users upload GLB files for new locations
4. **Spatial Search UI:** Draw a circle on the map, query PostGIS for locations inside
5. **PWA:** Offline map tiles + service worker caching

---

*Document version: 1.3*

**Changelog**
- v1.3 — Location edit/delete added: `PATCH /api/locations/:id` (name/description only; coordinates not editable), permission model via `canModifyLocation` (admin: any; owner: own location without a model or foreign images), `Location.updatedAt`, sidebar inline editing + delete confirm dialog (grilling round — ticket `.scratch/locations/issues/04-edit-delete-locations.md`).
- v1.2 — Locations implemented (CRUD + `ST_DWithin` radius search with geography GIST index, `thumbnail` field on the list endpoint); map UI redesigned (sidebar detail, hover tooltips, locate button, geolocation start with Skopje fallback — see ADR-0002); auth hardened further (same-host CSRF check, token-family revocation, cross-tab refresh lock, sessionStorage persistence); healthchecks + backup/restore scripts; Skopje seed data; `docs/implementation-status.md` added.
- v1.1 — Auth redesigned (access + rotating refresh tokens, revocation, roles); schema updated (`Role`, `RefreshToken`); infrastructure scaffolded (backend, frontend, nginx, compose files, `.env.example`); tracker items created under `.scratch/`; `docs/adr/0001-auth-jwt-over-keycloak.md` added.
- v1.0 — Initial version.
