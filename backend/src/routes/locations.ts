import { Router } from 'express'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { config } from '../lib/config'
import {
  createLocationSchema,
  nearbyQuerySchema,
  thumbnailPatchSchema,
  updateLocationSchema,
} from '../lib/schemas'
import { canModifyLocation } from '../lib/permissions'
import { authenticate, requireAdmin } from '../middleware/authenticate'

const router = Router()

// ── Public reads ────────────────────────────────────────────────────────────

router.get('/', async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        model: true,
        _count: { select: { images: true } },
        // Admin-pinned thumbnail (if any) + first image by carousel order as fallback.
        thumbnailImage: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
      },
    })
    res.json({
      locations: locations.map(({ images, thumbnailImage, ...loc }) => ({
        ...loc,
        thumbnail: thumbnailImage ?? images[0] ?? null,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// NOTE: registered before '/:id' so 'nearby' is not parsed as an id.
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, radius } = nearbyQuerySchema.parse(req.query)

    interface NearbyRow {
      id: number
      name: string
      description: string | null
      latitude: number
      longitude: number
      createdAt: Date
      userId: number | null
      distanceM: number
    }

    // Radius search in *meters* via the geography type (spherical distance).
    // Uses the functional GIST index idx_location_coords_geography
    // (see prisma/migrations/20260927000000_geography_gist_index).
    const rows = await prisma.$queryRaw<NearbyRow[]>`
      SELECT
        l.id,
        l.name,
        l.description,
        l.latitude,
        l.longitude,
        l."createdAt",
        l."userId",
        ST_Distance(
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
        ) AS "distanceM"
      FROM "Location" l
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
        ${radius}
      )
      ORDER BY "distanceM" ASC
    `

    res.json({ locations: rows })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: err.flatten() })
    }
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        model: true,
        images: { orderBy: { order: 'asc' } },
      },
    })
    if (!location) {
      return res.status(404).json({ error: 'Location not found' })
    }
    res.json({ location })
  } catch (err) {
    next(err)
  }
})

// ── Authenticated writes ────────────────────────────────────────────────────

router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = createLocationSchema.parse(req.body)

    // Duplicate names are allowed: locations are geographic entities, and the
    // same name in different places is legitimate. (Documented decision.)
    const location = await prisma.location.create({
      data: { ...body, userId: req.userId },
    })

    res.status(201).json({ location })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

// Admin-pinned carousel thumbnail (grilling decision: after the creator's
// initial batch, only admins may change which image is the thumbnail).
router.patch('/:id/thumbnail', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const { imageId } = thumbnailPatchSchema.parse(req.body)

    const location = await prisma.location.findUnique({ where: { id } })
    if (!location) {
      return res.status(404).json({ error: 'Location not found' })
    }

    if (imageId !== null) {
      const image = await prisma.image.findFirst({ where: { id: imageId, locationId: id } })
      if (!image) {
        return res.status(400).json({ error: 'Image does not belong to this location' })
      }
    }

    const updated = await prisma.location.update({
      where: { id },
      data: { thumbnailImageId: imageId },
    })
    res.json({ location: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

// Coordinates are deliberately not editable — see updateLocationSchema.
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const body = updateLocationSchema.parse(req.body)

    const location = await prisma.location.findUnique({
      where: { id },
      include: { model: true, images: true },
    })
    if (!location) {
      return res.status(404).json({ error: 'Location not found' })
    }

    const permission = canModifyLocation(location, req.userId, req.userRole)
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason ?? 'Forbidden' })
    }

    const data: { name?: string; description?: string | null } = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description

    const updated = await prisma.location.update({ where: { id }, data })
    res.json({ location: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const location = await prisma.location.findUnique({
      where: { id },
      include: { model: true, images: true },
    })
    if (!location) {
      return res.status(404).json({ error: 'Location not found' })
    }

    // Admin: any location. Owner: own location without a model or foreign images.
    const permission = canModifyLocation(location, req.userId, req.userRole)
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason ?? 'Forbidden' })
    }

    await prisma.location.delete({ where: { id } }) // cascades to Model + Image rows

    // Best-effort file cleanup after the DB delete (leftover files are harmless).
    const files: string[] = []
    if (location.model) files.push(path.join(config.modelsDir, location.model.filename))
    files.push(...location.images.map((img) => path.join(config.uploadDir, img.filename)))
    for (const file of files) {
      await fs.promises.rm(file, { force: true }).catch(() => undefined)
    }

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
