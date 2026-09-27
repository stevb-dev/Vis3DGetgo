import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { config } from '../lib/config'
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../lib/tokens'
import { authenticate } from '../middleware/authenticate'
import { authRateLimiter } from '../middleware/authRateLimiter'
import { csrfCheck } from '../middleware/csrfCheck'

const router = Router()

const REFRESH_COOKIE = 'refresh_token'
const REFRESH_COOKIE_PATH = '/api/auth'
const BCRYPT_COST = 12

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/, 'letters, numbers, dots, dashes, underscores'),
  password: z.string().min(8).max(72), // bcrypt truncates at 72 bytes
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
})

interface PublicUser {
  id: number
  email: string
  username: string
  role: 'USER' | 'ADMIN'
  createdAt: Date
}

function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  }
}

function setRefreshCookie(res: import('express').Response, token: string, maxAgeMs: number) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeMs,
  })
}

/**
 * Creates an access JWT + persists a hashed refresh token, then sets the
 * refresh cookie. Returns the access token.
 */
async function issueTokens(res: import('express').Response, userId: number, role: 'USER' | 'ADMIN'): Promise<string> {
  const accessToken = signAccessToken(userId, role)

  const rawRefresh = generateRefreshToken()
  const maxAgeMs = config.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + maxAgeMs)

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(rawRefresh), expiresAt },
  })

  setRefreshCookie(res, rawRefresh, maxAgeMs)
  return accessToken
}

router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body)

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    })
    if (existing) {
      return res.status(409).json({ error: 'Email or username already taken' })
    }

    // bcrypt generates and embeds a random per-password salt; we never touch salts.
    const password = await bcrypt.hash(body.password, BCRYPT_COST)
    const user = await prisma.user.create({
      data: { email: body.email, username: body.username, password },
    })

    const accessToken = await issueTokens(res, user.id, user.role)
    res.status(201).json({ accessToken, user: toPublicUser(user) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    const valid = user ? await bcrypt.compare(body.password, user.password) : false

    if (!user || !valid) {
      // Same message for unknown email and wrong password — no user enumeration.
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const accessToken = await issueTokens(res, user.id, user.role)
    res.json({ accessToken, user: toPublicUser(user) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

router.post('/refresh', csrfCheck, async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
    if (!raw) {
      return res.status(401).json({ error: 'No refresh token' })
    }

    const tokenHash = hashRefreshToken(raw)
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    if (stored.revokedAt) {
      // Theft signal: an already-rotated token was presented again.
      // Revoke the user's entire token family — all sessions die.
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    // Rotation: the presented token is revoked and a fresh pair is issued.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    const accessToken = await issueTokens(res, stored.user.id, stored.user.role)
    res.json({ accessToken, user: toPublicUser(stored.user) })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', csrfCheck, async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
    if (raw) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(raw) },
        data: { revokedAt: new Date() },
      })
    }
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

export default router
