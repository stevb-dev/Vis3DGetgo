import { useAuthStore, AuthUser } from '../stores/auth'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Refreshes are serialized so the same refresh cookie is never presented
 * concurrently — which the server's family-revocation theft detection would
 * (correctly) treat as theft:
 * - an in-flight promise dedupes refreshes within this tab;
 * - a cooperative localStorage lock (5s timestamp lease, same trick as
 *   auth0-spa-js) serializes refreshes across tabs. It stores no credentials.
 */
const REFRESH_LOCK_KEY = 'thesis.auth.refresh-lock'
const REFRESH_LOCK_LEASE_MS = 5000

async function acquireRefreshLock(): Promise<void> {
  const deadline = Date.now() + REFRESH_LOCK_LEASE_MS
  for (;;) {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY)
    const heldUntil = raw ? Number(raw) : 0
    if (!raw || heldUntil < Date.now()) {
      localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now() + REFRESH_LOCK_LEASE_MS))
      return
    }
    if (Date.now() > deadline) return // lock held too long — attempt anyway
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

function releaseRefreshLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY)
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * Silent refresh via the httpOnly cookie (the source of truth for the session).
 * Returns true when a fresh access token was obtained.
 *
 * Only a 401 clears local auth state — it means the refresh cookie is missing,
 * revoked or expired. Other failures (network, 5xx, 403) keep the current
 * session state so a temporary API hiccup doesn't log the user out.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = performRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function performRefresh(): Promise<boolean> {
  await acquireRefreshLock()
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (res.status === 401) {
      useAuthStore.getState().clearAuth()
      return false
    }
    if (!res.ok) {
      return false
    }
    const data = (await res.json()) as { accessToken: string; user: AuthUser }
    useAuthStore.getState().setTokens(data.accessToken, data.user)
    return true
  } catch {
    return false
  } finally {
    releaseRefreshLock()
  }
}

export async function bootstrapAuth(): Promise<void> {
  // The store restores the last access token from sessionStorage synchronously
  // on module load (no logged-out flash on F5). This call silently rotates and
  // refreshes the token pair via the httpOnly cookie.
  await refreshAccessToken()
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = useAuthStore.getState().accessToken
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' })

  // Single refresh + retry on 401 (auth endpoints manage their own 401s).
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryHeaders = new Headers(options.headers)
      // The retry must re-send Content-Type, or express.json() won't parse
      // the body and the endpoint 400s after a successful refresh.
      if (options.body && !(options.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json')
      }
      const newToken = useAuthStore.getState().accessToken
      if (newToken) retryHeaders.set('Authorization', `Bearer ${newToken}`)
      res = await fetch(`${BASE}${path}`, { ...options, headers: retryHeaders, credentials: 'include' })
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, body.error ?? res.statusText)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
