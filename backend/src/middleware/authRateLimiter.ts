import rateLimit from 'express-rate-limit'

/** Brute-force protection for register/login. Tuning tracked in .scratch/auth/issues/04-auth-hardening-review.md */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
})
