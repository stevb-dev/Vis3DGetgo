# 01: Core register/login endpoints

Status: resolved
Feature: auth

## Summary

Implemented in `backend/src/routes/auth.ts`:

- `POST /api/auth/register`: zod validation (email, username pattern, password 8–72 chars), duplicate email/username → 409, bcrypt cost 12, creates `USER`, issues access token + refresh cookie.
- `POST /api/auth/login`: bcrypt compare, identical `401 Invalid credentials` for unknown email vs wrong password, issues token pair.
- Both rate-limited (10 req/min per IP) via `authRateLimiter`.
- Errors never echo back whether an email exists.

## Notes

- bcrypt handles salting internally (random per-password salt embedded in the hash) — see ADR-0001.
