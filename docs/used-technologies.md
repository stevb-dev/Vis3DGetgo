# Used Technologies

Short descriptions of everything used in the Geospatial 3D Visualization Platform, grouped by category.

## Languages & Core Runtime

- **TypeScript** — typed superset of JavaScript; used across both frontend and backend for type safety.
- **Node.js 20 LTS** — JavaScript server runtime for the Express backend.

## Frontend

- **React 18** — component-based UI library.
- **Vite** — fast build tool and dev server (with hot module reload).
- **React Router** — client-side routing (map stays mounted on detail pages).
- **Leaflet** — lightweight open-source interactive 2D map (no API key, works offline).
- **React-Leaflet** — React bindings for Leaflet.
- **Three.js** — WebGL library for rendering 3D models in the browser.
- **React Three Fiber (R3F)** — declarative React renderer for Three.js scenes.
- **Drei** — collection of ready-made helpers for R3F (model loading, camera controls, etc.).
- **TanStack Query** — server-state management: data fetching, caching, mutations.
- **Zustand** — tiny global state store (auth, selected location).
- **shadcn/ui + Radix UI** — accessible, copy-in UI components (dialogs, forms) built on Radix primitives.
- **Tailwind CSS** — utility-first CSS framework for styling.
- **react-hook-form + Zod** — form handling with runtime schema validation.
- **react-dropzone** — drag-and-drop file upload UI.
- **sonner** — toast notifications.
- **lucide-react** — icon set.
- **clsx / tailwind-merge / class-variance-authority** — small utilities for composing class names and style variants.

## Backend

- **Express** — minimal HTTP server framework for the REST API.
- **tsx** — TypeScript execution for dev (`tsx watch`) and scripts.
- **Prisma ORM** — type-safe database access, schema definition, and migrations.
- **PostgreSQL 16** — relational database.
- **PostGIS** — spatial extension enabling geo queries (`ST_DWithin`, GiST index).
- **bcrypt** — password hashing with embedded per-password salt (cost 12).
- **jsonwebtoken** — signs/verifies short-lived JWT access tokens.
- **cookie-parser** — parses the httpOnly refresh-token cookie.
- **express-rate-limit** — brute-force protection on auth endpoints.
- **helmet** — sets security-related HTTP headers.
- **cors** — cross-origin request handling.
- **multer** — parses multipart/form-data for image uploads.
- **sharp** — server-side image processing (resize + WebP conversion).
- **uuid** — unique filenames for uploads.

## Testing & Tooling

- **Vitest** — unit test runner for backend logic (auth, permissions, CSRF, schemas).

## Infrastructure

- **Docker + Docker Compose** — containerized on-premise deployment (dev and prod profiles).
- **Nginx** — reverse proxy: serves static files (`/uploads`, `/models`), proxies `/api` to the backend, serves the built SPA.
- **Docker volumes** — persistent storage for the DB, uploaded images, and 3D models.
- **gltf-pipeline** — CLI used once to Draco-compress the pre-seeded GLB models.
- **Backup/restore scripts** — `pg_dump` + tar with 7-day rotation for on-premise backups.
