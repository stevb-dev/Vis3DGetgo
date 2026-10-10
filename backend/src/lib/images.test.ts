import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { imageFileFilter, mayPickThumbnailOnUpload, processImage } from './images'
import { REPORT_CATEGORIES, reportBodySchema, thumbnailPatchSchema } from './schemas'

/** A tiny red PNG produced by sharp itself — no fixtures on disk. */
async function tinyPng(width = 100, height = 80): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#cc2222' } }).png().toBuffer()
}

describe('mayPickThumbnailOnUpload', () => {
  it('allows the location owner on the initial (zero-image) batch', () => {
    expect(
      mayPickThumbnailOnUpload({ imageCount: 0, requesterId: 7, ownerId: 7, role: 'USER' }),
    ).toBe(true)
  })

  it('allows admins on an empty location regardless of ownership', () => {
    expect(
      mayPickThumbnailOnUpload({ imageCount: 0, requesterId: 1, ownerId: 7, role: 'ADMIN' }),
    ).toBe(true)
  })

  it('blocks a non-owner even when the location is empty', () => {
    expect(
      mayPickThumbnailOnUpload({ imageCount: 0, requesterId: 8, ownerId: 7, role: 'USER' }),
    ).toBe(false)
  })

  it('blocks everyone once the location already has images (admin-only from then on)', () => {
    expect(
      mayPickThumbnailOnUpload({ imageCount: 3, requesterId: 7, ownerId: 7, role: 'USER' }),
    ).toBe(false)
    expect(
      mayPickThumbnailOnUpload({ imageCount: 3, requesterId: 1, ownerId: 7, role: 'ADMIN' }),
    ).toBe(false)
  })
})

describe('imageFileFilter', () => {
  const file = (mimetype: string) => ({ mimetype }) as Express.Multer.File

  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (mimetype) => {
    const calls: unknown[] = []
    const cb = ((...args: unknown[]) => calls.push(args)) as never
    imageFileFilter({} as Express.Request, file(mimetype), cb)
    expect(calls[0]).toEqual([null, true])
  })

  it('rejects unsupported types with a clear message', () => {
    const calls: unknown[] = []
    const cb = ((...args: unknown[]) => calls.push(args)) as never
    imageFileFilter({} as Express.Request, file('image/gif'), cb)
    const [err] = calls[0] as [Error]
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/image\/gif/)
    expect(err.message).toMatch(/JPEG, PNG, WebP/)
  })
})

describe('processImage (sharp pipeline)', () => {
  it('converts PNG to WebP without enlarging', async () => {
    const input = await tinyPng(100, 80)
    const { buffer, info } = await processImage(input)

    expect(info.format).toBe('webp')
    expect(info.width).toBe(100)
    expect(info.height).toBe(80)
    // RIFF....WEBP magic
    expect(buffer.subarray(0, 4).toString()).toBe('RIFF')
    expect(buffer.subarray(8, 12).toString()).toBe('WEBP')
  })

  it('downscales large images into the 1200×800 box (aspect preserved)', async () => {
    const input = await tinyPng(2400, 1200)
    const { info } = await processImage(input)

    expect(info.width).toBeLessThanOrEqual(1200)
    expect(info.height).toBeLessThanOrEqual(800)
    expect(info.width / info.height).toBeCloseTo(2, 1) // 2:1 aspect kept
  })

  it('does not enlarge small images (withoutEnlargement)', async () => {
    const input = await tinyPng(40, 30)
    const { info } = await processImage(input)
    expect(info.width).toBe(40)
    expect(info.height).toBe(30)
  })
})

describe('report + thumbnail schemas', () => {
  it('accepts every predefined report category', () => {
    for (const category of REPORT_CATEGORIES) {
      expect(reportBodySchema.parse({ category }).category).toBe(category)
    }
  })

  it('rejects free-text and unknown categories', () => {
    expect(() => reportBodySchema.parse({ category: 'SPAM ' })).toThrow()
    expect(() => reportBodySchema.parse({ category: 'ANYTHING' })).toThrow()
    expect(() => reportBodySchema.parse({})).toThrow()
  })

  it('thumbnail patch accepts an image id or null (clear pin)', () => {
    expect(thumbnailPatchSchema.parse({ imageId: 5 })).toEqual({ imageId: 5 })
    expect(thumbnailPatchSchema.parse({ imageId: null })).toEqual({ imageId: null })
  })

  it('thumbnail patch rejects non-positive or missing image ids', () => {
    expect(() => thumbnailPatchSchema.parse({ imageId: 0 })).toThrow()
    expect(() => thumbnailPatchSchema.parse({ imageId: -2 })).toThrow()
    expect(() => thumbnailPatchSchema.parse({})).toThrow()
  })
})
