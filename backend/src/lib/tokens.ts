import crypto from 'crypto'
import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from './config'

export interface AccessTokenPayload {
  userId: number
  role: 'USER' | 'ADMIN'
}

/**
 * Short-lived (15m) access token, held in SPA memory only.
 * `ttl` and `secret` overrides exist for unit tests.
 */
export function signAccessToken(
  userId: number,
  role: 'USER' | 'ADMIN',
  ttl: string = config.accessTokenTtl,
  secret: string = config.jwtSecret,
): string {
  return jwt.sign({ userId, role }, secret, {
    expiresIn: ttl as SignOptions['expiresIn'],
  } as SignOptions)
}

export function verifyAccessToken(token: string, secret: string = config.jwtSecret): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload
}

/** Opaque 256-bit token delivered as an httpOnly cookie. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Only the SHA-256 hash of a refresh token is ever stored in the DB. */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
