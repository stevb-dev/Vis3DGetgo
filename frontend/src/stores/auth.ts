import { create } from 'zustand'

export interface AuthUser {
  id: number
  email: string
  username: string
  role: 'USER' | 'ADMIN'
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setTokens: (accessToken: string, user: AuthUser) => void
  clearAuth: () => void
}

/**
 * Where tokens live:
 * - Refresh token: httpOnly cookie (invisible to JS) — the long-lived (7d)
 *   credential. Survives reloads AND browser restarts; it is what keeps you
 *   logged in.
 * - Access token: memory + sessionStorage (this tab only). sessionStorage
 *   survives F5, so a reload neither logs you out nor burns a refresh
 *   rotation. Trade-off: JS-readable (XSS exposure), bounded by the
 *   15-minute TTL.
 * - localStorage is deliberately NOT used: nothing persists across browser
 *   restarts except the httpOnly refresh cookie.
 */
const SESSION_KEY = 'thesis.auth.session'

function readSession(): { accessToken: string; user: AuthUser } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { accessToken?: unknown; user?: unknown }
    if (typeof parsed.accessToken === 'string' && parsed.user) {
      return { accessToken: parsed.accessToken, user: parsed.user as AuthUser }
    }
    return null
  } catch {
    return null
  }
}

function writeSession(accessToken: string, user: AuthUser) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, user }))
  } catch {
    // Storage disabled/full — memory-only fallback.
  }
}

const initial = readSession()

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: initial?.accessToken ?? null,
  user: initial?.user ?? null,
  setTokens: (accessToken, user) => {
    writeSession(accessToken, user)
    set({ accessToken, user })
  },
  clearAuth: () => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // noop
    }
    set({ accessToken: null, user: null })
  },
}))
