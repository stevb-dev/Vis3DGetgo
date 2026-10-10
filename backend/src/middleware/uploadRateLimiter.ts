import rateLimit from 'express-rate-limit'

/**
 * Upload abuse guard: disk-fill via open registration is the one real vector.
 * Keyed per authenticated user (JWT userId) — the endpoint sits behind
 * `authenticate`, so IP keying would wrongly throttle NAT-sharing users.
 * Note: per-user buckets are bypassable by re-registering; the hard bound on
 * growth is MAX_IMAGES_PER_LOCATION, enforced in the upload handler itself.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId ?? req.ip),
  message: { error: 'Too many uploads, please try again later' },
})
