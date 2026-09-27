# auth — spec

Full auth design: bcrypt password hashing, short-lived JWT access tokens (15m), opaque rotating refresh tokens in httpOnly cookies (7d), hashed at rest in Postgres, `USER`/`ADMIN` roles, rate limiting, and SPA plumbing (Zustand memory store, silent refresh on boot, 401-refresh-retry).

## Decisions

- Hand-rolled JWT over Keycloak/OIDC: `docs/adr/0001-auth-jwt-over-keycloak.md`
- Password hashing delegated to bcrypt (cost 12). Salts are generated and embedded by bcrypt — the app never touches salts.
- Refresh tokens: opaque 256-bit random, SHA-256 hash stored in `RefreshToken`, rotation on use, family revocation on reuse (theft response).
- Access token in SPA memory + sessionStorage (tab-scoped, survives F5; never localStorage); refresh token as `httpOnly + Secure + SameSite=Strict` cookie, path `/api/auth`.
- Roles: `USER`, `ADMIN`. Admin is seeded (`SEED_ADMIN_*` env).

## Endpoints

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/auth/register` | zod, bcrypt, 409 on duplicate, issues token pair |
| POST | `/api/auth/login` | generic 401 (no enumeration), issues token pair |
| POST | `/api/auth/refresh` | rotates refresh token, returns fresh access token |
| POST | `/api/auth/logout` | revokes refresh token, clears cookie |
| GET | `/api/auth/me` | requires access token, returns public user |

## Implementation state

Fully implemented end-to-end: backend (`backend/src/routes/auth.ts`, `backend/src/lib/tokens.ts`, `backend/src/middleware/{authenticate,csrfCheck,authRateLimiter}.ts`) + frontend (`frontend/src/{stores/auth.ts,lib/api.ts,components/{Header,ProtectedRoute}.tsx,pages/{Login,Register}Page.tsx}`). Unit tests in `backend/src/lib/auth.test.ts` (`npm test`). All tickets resolved.

## Tickets

- `01-core-register-login.md`
- `02-refresh-token-rotation.md`
- `03-roles-and-admin.md`
- `04-auth-hardening-review.md`
- `05-frontend-auth-state-ui.md`
