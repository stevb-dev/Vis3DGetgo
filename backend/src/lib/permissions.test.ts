import { describe, expect, it } from 'vitest'
import { canModifyLocation } from './permissions'

const mine = (overrides: Partial<{ userId: number | null; model: unknown; images: Array<{ userId: number }> }> = {}) => ({
  userId: 1,
  model: null,
  images: [],
  ...overrides,
})

describe('canModifyLocation', () => {
  it('allows admins on any location, including foreign ones with content', () => {
    const p = canModifyLocation(mine({ userId: 99, model: { id: 1 }, images: [{ userId: 2 }] }), 1, 'ADMIN')
    expect(p.allowed).toBe(true)
  })

  it('allows the owner of an empty location', () => {
    expect(canModifyLocation(mine(), 1, 'USER').allowed).toBe(true)
  })

  it('allows the owner when every image is their own', () => {
    expect(canModifyLocation(mine({ images: [{ userId: 1 }, { userId: 1 }] }), 1, 'USER').allowed).toBe(true)
  })

  it('blocks non-owners', () => {
    const p = canModifyLocation(mine(), 2, 'USER')
    expect(p.allowed).toBe(false)
    expect(p.reason).toMatch(/own locations/)
  })

  it('blocks the owner when a model is attached', () => {
    const p = canModifyLocation(mine({ model: { id: 5 } }), 1, 'USER')
    expect(p.allowed).toBe(false)
    expect(p.reason).toMatch(/3D model/)
  })

  it('blocks the owner when a foreign image exists', () => {
    const p = canModifyLocation(mine({ images: [{ userId: 1 }, { userId: 2 }] }), 1, 'USER')
    expect(p.allowed).toBe(false)
    expect(p.reason).toMatch(/other users/)
  })

  it('blocks unknown/anonymous callers on owned locations', () => {
    expect(canModifyLocation(mine(), undefined, undefined).allowed).toBe(false)
  })
})
