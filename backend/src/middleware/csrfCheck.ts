import { NextFunction, Request, Response } from 'express'

/**
 * CSRF guard for cookie-bearing endpoints (refresh/logout).
 *
 * Strategy: when an Origin header is present (browsers send one for
 * cross-site — and nowadays same-site — POSTs), its hostname must match the
 * request's Host header hostname. A CSRF attack originates from a different
 * site, so its Origin host will differ. Requests without an Origin
 * (curl, server-to-server) are not CSRF-relevant and pass through.
 *
 * Deliberately hostname-based instead of an allowlist: it works whether the
 * app is served at localhost:5173 (Vite), localhost:80 (nginx) or
 * http://<server-ip>, with zero configuration. Complements SameSite=Strict.
 */
export function csrfCheck(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin
  if (!origin) {
    return next()
  }

  let originHost: string
  try {
    originHost = new URL(origin).hostname
  } catch {
    return res.status(403).json({ error: 'Invalid origin' })
  }

  // The Host header may include a port (localhost:5173) — compare hostnames only.
  const requestHost = (req.headers.host ?? '').split(':')[0]

  if (originHost.toLowerCase() !== requestHost.toLowerCase()) {
    return res.status(403).json({ error: 'Invalid origin' })
  }

  next()
}
