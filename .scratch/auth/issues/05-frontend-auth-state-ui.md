# 05: Frontend auth state + UI

Status: resolved
Feature: auth

## Context

Plumbing exists: `frontend/src/stores/auth.ts` (Zustand, memory-only), `frontend/src/lib/api.ts` (Bearer attach, 401 → single refresh → retry → logout, `bootstrapAuth()` on boot), `frontend/src/components/ProtectedRoute.tsx`. `LoginPage`/`RegisterPage` are placeholders.

## Requirements

- [ ] Build `/login` and `/register` forms (shadcn/ui Form + zod) wired to `POST /auth/*`
- [ ] On success: `setTokens()` → navigate to the originally requested location
- [ ] Wire `ProtectedRoute` around future upload/create-location pages
- [ ] Logout button: `POST /auth/logout` + `clearAuth()` + redirect to `/`
- [ ] Header component showing the current user (`GET /auth/me`) with login/register links when signed out
- [ ] Error handling: invalid credentials, email taken, rate limited (429)

## Notes

- Keep tokens out of localStorage — refresh rides the httpOnly cookie automatically (`credentials: 'include'`).

## Comments

- 2026-09-27 (agent): Implemented.
  - `/login` + `/register` forms: shadcn/ui (Card/Input/Button/Form) + react-hook-form + zod, matching the backend schemas (username pattern, password 8–72, confirm field).
  - Success → `setTokens()` → navigate to `location.state.from` (login) or `/` (register).
  - `ProtectedRoute` wired around `/locations/new` (placeholder CreateLocationPage) and passes `state.from` so login returns you to the requested page.
  - `Header` shows the current user (GET `/auth/me` query, enabled only with a token), an ADMIN badge, and a Log out button (`POST /auth/logout` + `clearAuth()` + query cleanup + redirect). Logged-out state shows Log in / Register links.
  - Errors surfaced inline: invalid credentials (401), email/username taken (409), rate limited (429) — via `ApiError`.
  - shadcn/ui components hand-authored (`button`, `input`, `label`, `card`, `form`); deps added: react-hook-form, @hookform/resolvers, zod, radix label/slot, cva.
- 2026-09-27 (agent, follow-up): Access token now also persisted in **sessionStorage** (tab-scoped) — F5 restores the session instantly with no logged-out flash and no refresh-cookie rotation churn; the httpOnly cookie remains the source of truth (`bootstrapAuth` still rotates silently in the background). Only a 401 from `/refresh` clears auth — network/5xx hiccups keep the session.
- 2026-09-27 (agent, follow-up): Cross-tab semantics — sessionStorage is per-tab, so a new tab starts visually logged-out and silently re-authenticates via the shared httpOnly cookie (session is shared across tabs; logout propagates lazily on the next refresh). Concurrent refreshes are serialized (in-flight promise + cooperative localStorage lock, 5s lease) so two tabs can't present the same cookie simultaneously and trip the family-revocation theft detection. Residual: a hard server-side grace period for rotated tokens remains as future hardening.
