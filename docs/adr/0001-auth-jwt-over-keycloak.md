# ADR-0001: Hand-rolled JWT auth (access + rotating refresh) over self-hosted Keycloak

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Thesis author (+ agent)

## Context

The platform needs user accounts: registration, login, ownership of uploaded images, and admin-only model registration. Options considered:

1. Self-hosted Keycloak instance
2. OIDC federation with an institutional identity provider
3. Passport.js + server sessions
4. Hand-rolled JWT

## Decision

Hand-rolled JWT with split tokens:

- **Access token**: signed JWT (HS256), 15-minute TTL, payload `{ userId, role }`, held in SPA memory + sessionStorage (tab-scoped), sent as `Authorization: Bearer`.
- **Refresh token**: opaque 256-bit random string, delivered as an `httpOnly + Secure + SameSite=Strict` cookie scoped to `/api/auth`, stored in Postgres as a SHA-256 hash, rotated on every use.
- Passwords hashed with bcrypt cost 12 — the salt is generated and embedded by bcrypt automatically; the application never touches salts.

## Alternatives considered

- **Keycloak (self-hosted)**: solves SSO/federation across many applications; this project is one SPA + one API with a two-level role split. Costs: ~1GB RAM JVM + its own database, realm/client/mapper configuration, another service to patch/backup/secure on-premise, and it would dominate the thesis narrative at the expense of the geospatial + 3D topic. Rejected.
- **OIDC federation with university IdP**: attractive if an institutional IdP exists — then login with university credentials becomes a feature. Kept as a stretch goal: consume OIDC as a client (PKCE), do not host our own IdP.
- **Sessions (Passport + express-session)**: fully stateful; every request needs a session-store lookup. The stateless access-token verification is a better fit for the read-heavy map API, and session stores add a Redis dependency (or Postgres round-trips) that JWT avoids.

## Consequences

**Positive**

- Defensible line by line at defense; demonstrates understanding of token lifecycle, rotation, and revocation.
- Real revocation story (single long-lived JWT has none).
- Zero additional services, consistent with the on-premise thesis.

**Negative**

- Refresh-token rotation/family-revocation and cookie semantics are our responsibility.
- Up to 15 minutes of stale access after logout (documented trade-off).

## Related

- `THESIS_TECH_STACK.md` §9 (design) and §13 (defense talking points)
- `.scratch/auth/spec.md`
- Implementation: `backend/src/routes/auth.ts`, `backend/src/lib/tokens.ts`
