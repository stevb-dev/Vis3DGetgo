import { describe, expect, it } from 'vitest'
import { createLocationSchema, nearbyQuerySchema, resolveQuerySchema, updateLocationSchema } from './schemas'

const valid = {
  name: 'Test Point',
  description: 'A demo location',
  latitude: 46.05,
  longitude: 14.5,
  category: 'MONUMENTS',
}

describe('createLocationSchema', () => {
  it('accepts a valid payload', () => {
    expect(createLocationSchema.parse(valid)).toEqual(valid)
  })

  it('trims the name and allows a missing description', () => {
    const parsed = createLocationSchema.parse({ name: '  Castle  ', latitude: 0, longitude: 0, category: 'MONUMENTS' })
    expect(parsed.name).toBe('Castle')
    expect(parsed.description).toBeUndefined()
  })

  it('rejects a missing category', () => {
    expect(() => createLocationSchema.parse({ name: 'X', latitude: 0, longitude: 0 })).toThrow()
  })

  it('rejects an unknown category', () => {
    expect(() => createLocationSchema.parse({ ...valid, category: 'PARKS' })).toThrow()
  })

  it.each([
    ['empty name', { ...valid, name: '   ' }],
    ['name too long', { ...valid, name: 'a'.repeat(121) }],
    ['lat > 90', { ...valid, latitude: 91 }],
    ['lat < -90', { ...valid, latitude: -91 }],
    ['lng > 180', { ...valid, longitude: 181 }],
    ['lng < -180', { ...valid, longitude: -181 }],
    ['non-numeric latitude', { ...valid, latitude: '46' }],
    ['description too long', { ...valid, description: 'x'.repeat(501) }],
  ])('rejects %s', (_label, payload) => {
    expect(() => createLocationSchema.parse(payload)).toThrow()
  })
})

describe('nearbyQuerySchema', () => {
  it('coerces query strings and applies the default radius', () => {
    expect(nearbyQuerySchema.parse({ lat: '46.05', lng: '14.5' })).toEqual({
      lat: 46.05,
      lng: 14.5,
      radius: 1000,
    })
  })

  it('rejects out-of-range coordinates', () => {
    expect(() => nearbyQuerySchema.parse({ lat: '91', lng: '14.5' })).toThrow()
    expect(() => nearbyQuerySchema.parse({ lat: '46', lng: '-181' })).toThrow()
  })

  it('rejects radii outside 1..50000 meters', () => {
    expect(() => nearbyQuerySchema.parse({ lat: 46, lng: 14, radius: '0' })).toThrow()
    expect(() => nearbyQuerySchema.parse({ lat: 46, lng: 14, radius: '60000' })).toThrow()
  })
})

describe('resolveQuerySchema', () => {
  it('coerces query strings', () => {
    expect(resolveQuerySchema.parse({ lat: '41.9961', lng: '21.4326' })).toEqual({
      lat: 41.9961,
      lng: 21.4326,
    })
  })

  it('rejects out-of-range coordinates', () => {
    expect(() => resolveQuerySchema.parse({ lat: '91', lng: '14' })).toThrow()
    expect(() => resolveQuerySchema.parse({ lat: '46', lng: '-181' })).toThrow()
  })
})

describe('updateLocationSchema', () => {
  it('accepts a name-only update', () => {
    expect(updateLocationSchema.parse({ name: 'New name' })).toEqual({ name: 'New name' })
  })

  it('accepts clearing the description via null', () => {
    expect(updateLocationSchema.parse({ description: null })).toEqual({ description: null })
  })

  it('accepts both fields', () => {
    const parsed = updateLocationSchema.parse({ name: 'X', description: 'Y' })
    expect(parsed).toEqual({ name: 'X', description: 'Y' })
  })

  it('accepts a category-only update', () => {
    expect(updateLocationSchema.parse({ category: 'NATURE' })).toEqual({ category: 'NATURE' })
  })

  it('rejects an unknown category', () => {
    expect(() => updateLocationSchema.parse({ category: 'PARKS' })).toThrow()
  })

  it('rejects an empty payload (nothing to update)', () => {
    expect(() => updateLocationSchema.parse({})).toThrow()
  })

  it('rejects coordinates — they are deliberately not editable', () => {
    expect(() => updateLocationSchema.parse({ latitude: 41.9 })).toThrow()
  })

  it('rejects invalid field values', () => {
    expect(() => updateLocationSchema.parse({ name: '  ' })).toThrow()
    expect(() => updateLocationSchema.parse({ description: 'x'.repeat(501) })).toThrow()
  })
})
