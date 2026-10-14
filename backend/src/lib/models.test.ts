import { describe, expect, it } from 'vitest'
import { modelFormatFromFilename } from './models'

describe('modelFormatFromFilename', () => {
  it('maps .glb to GLB (case-insensitive)', () => {
    expect(modelFormatFromFilename('fortress.glb')).toBe('GLB')
    expect(modelFormatFromFilename('Fortress.GLB')).toBe('GLB')
  })

  it('maps .spz to SPZ (case-insensitive)', () => {
    expect(modelFormatFromFilename('splat.spz')).toBe('SPZ')
    expect(modelFormatFromFilename('Splat.SPZ')).toBe('SPZ')
  })

  it('handles multi-dot and spaced names from the final extension', () => {
    expect(modelFormatFromFilename('matka.canyon.v2.glb')).toBe('GLB')
    expect(modelFormatFromFilename('my model.spz')).toBe('SPZ')
  })

  it('rejects missing, unknown, or leading-dot extensions', () => {
    expect(modelFormatFromFilename('noext')).toBeNull()
    expect(modelFormatFromFilename('model.obj')).toBeNull()
    expect(modelFormatFromFilename('model.gltf')).toBeNull()
    expect(modelFormatFromFilename('.glb')).toBeNull()
    expect(modelFormatFromFilename('')).toBeNull()
  })
})
