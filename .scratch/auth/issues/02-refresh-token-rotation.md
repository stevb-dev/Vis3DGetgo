# 02: Refresh token rotation + revocation

Status: resolved
Feature: auth

## Summary

Implemented:

- `RefreshToken` model (SHA-256 hash stored, `expiresAt`, `revokedAt`) — `backend/prisma/schema.prisma`.
- `POST /api/auth/refresh` validates the cookie, checks revoked/expired, then **rotates** (revokes old row, issues new token + cookie) and returns a fresh access token.
- `POST /api/auth/logout` revokes the presented token and clears the cookie.
- Cookie: `httpOnly`, `Secure` (config-driven), `SameSite=Strict`, path `/api/auth` — never sent to non-auth endpoints.
- Access tokens are 15m; logout takes effect for the refresh path immediately, for the access path within ≤15m (documented trade-off).

## Follow-ups

- Reuse detection (revoke whole token family when an already-revoked token is presented) — tracked in `04-auth-hardening-review.md`.
