# 04: Auth hardening review

Status: resolved
Feature: auth

## Context

Basic protections exist (rate limiter 10/min on register/login, generic login error, httpOnly cookie, bcrypt 12). This is the hardening pass.

## Requirements

- [ ] CSRF: verify `Origin`/`Referer` on `POST /api/auth/refresh` and `/logout` (belt-and-braces with SameSite=Strict)
- [ ] Theft detection: presenting an already-revoked refresh token revokes the user's whole token family (revoke all non-expired rows for that user)
- [ ] Confirm identical error responses for unknown email vs wrong password (audit)
- [ ] Tune/justify rate-limit values (`windowMs`, `limit`) and document for the thesis
- [ ] Unit tests: token sign/verify, bcrypt roundtrip, rotation + reuse logic
- [ ] Document the 15-minute access-token logout window trade-off

## Notes

- `express-rate-limit` v7 config lives in `backend/src/middleware/authRateLimiter.ts`.

## Comments

- 2026-09-27 (agent): Implemented and verified.
  - CSRF: `backend/src/middleware/csrfCheck.ts` — Origin must match `CORS_ORIGIN` when present; wired on `/refresh` and `/logout` (bogus-origin request verified → 403). Requests without Origin (non-browser) pass.
  - Theft detection: re-presenting a revoked refresh token revokes the user's entire token family (`updateMany` on all non-revoked rows). E2E-verified with two live sessions: reuse → 401, then both other sessions → 401.
  - Error-message audit: login returns identical `401 Invalid credentials` for unknown email vs wrong password; register's 409 (email/username taken) is intentional and standard.
  - Rate limit: 10 req/min per IP on register/login — justified for a small on-premise user base; documented in THESIS_TECH_STACK.md §9.
  - Unit tests: `backend/src/lib/auth.test.ts` (9 vitest tests — JWT roundtrip/tamper/expiry/wrong-secret, refresh token uniqueness + hashing, bcrypt roundtrip + salt randomness). Run with `npm test`.
  - 15-minute logout window documented in ADR-0001 Consequences.
- 2026-09-27 (agent, follow-up): Bug found in the CSRF check — the allowlist only accepted `http://localhost:5173`, so users browsing via nginx at `http://localhost` got 403 on `/refresh` and were silently logged out on every reload. Fixed: the check now compares the **Origin hostname against the request Host header hostname** (port-agnostic, works at any URL) — `backend/src/middleware/csrfCheck.ts` + 4 regression tests. Live-verified: `Origin: http://localhost` → 200, `http://localhost:5173` → 200, `http://evil.example` → 403.
