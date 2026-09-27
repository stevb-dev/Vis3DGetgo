import { describe, expect, it } from 'vitest'
import bcrypt from 'bcrypt'
import { generateRefreshToken, hashRefreshToken, signAccessToken, verifyAccessToken } from './tokens'

describe('access tokens (JWT)', () => {
  it('signs and verifies a roundtrip', () => {
    const token = signAccessToken(1, 'USER')
    expect(verifyAccessToken(token)).toMatchObject({ userId: 1, role: 'USER' })
  })

  it('rejects a tampered payload (forged ADMIN role)', () => {
    const token = signAccessToken(1, 'USER')
    const [, , signature] = token.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ userId: 1, role: 'ADMIN' })).toString('base64url')
    const forged = `eyJhbGciOiJIUzI1NiJ9.${forgedPayload}.${signature}`
    expect(() => verifyAccessToken(forged)).toThrow()
  })

  it('rejects expired tokens', () => {
    const token = signAccessToken(1, 'USER', '0s')
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('rejects tokens signed with a different secret', () => {
    const token = signAccessToken(1, 'USER', undefined, 'attacker-secret')
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('embeds the role in the payload', () => {
    const admin = signAccessToken(2, 'ADMIN')
    expect(verifyAccessToken(admin).role).toBe('ADMIN')
  })
})

describe('refresh tokens (opaque)', () => {
  it('generates unique, sufficiently long tokens', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(43) // 32 bytes base64url
  })

  it('hashes deterministically and never stores the raw value', () => {
    const raw = generateRefreshToken()
    expect(hashRefreshToken(raw)).toBe(hashRefreshToken(raw))
    expect(hashRefreshToken(raw)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashRefreshToken(raw)).not.toBe(raw)
  })
})

describe('passwords (bcrypt)', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    // Cost 4 keeps the test fast; production uses cost 12.
    const hash = await bcrypt.hash('StrongPass123', 4)
    expect(await bcrypt.compare('StrongPass123', hash)).toBe(true)
    expect(await bcrypt.compare('WrongPass123', hash)).toBe(false)
  })

  it('produces a different hash for the same password (random salt)', async () => {
    const a = await bcrypt.hash('SamePassword', 4)
    const b = await bcrypt.hash('SamePassword', 4)
    expect(a).not.toBe(b)
  })
})
