import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()

// ── Per-user bookmarks (.scratch/sidebar-redesign/issues/03) ────────────────
// A SavedLocation is one (user, location) pair. Save is a toggle: POST flips
// the state and returns the new value; GET reads it for the filled bookmark
// icon. All routes are auth-required (guests see a log-in prompt in the UI).

function parseId(raw: string): number | null {
  const id = Number(raw)
  return Number.isInteger(id) ? id : null
}

// Read: is this location saved by the current user?
router.get('/locations/:id/save', authenticate, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const saved = await prisma.savedLocation.findUnique({
      where: { userId_locationId: { userId: req.userId as number, locationId: id } },
    })
    res.json({ saved: saved !== null })
  } catch (err) {
    next(err)
  }
})

// Toggle: save if absent, unsave if present. Returns the new state.
router.post('/locations/:id/save', authenticate, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (id === null) {
      return res.status(400).json({ error: 'Invalid id' })
    }
    const userId = req.userId as number

    // The location must exist (404 mirrors the rest of the API).
    const location = await prisma.location.findUnique({ where: { id }, select: { id: true } })
    if (!location) {
      return res.status(404).json({ error: 'Location not found' })
    }

    const existing = await prisma.savedLocation.findUnique({
      where: { userId_locationId: { userId, locationId: id } },
    })

    if (existing) {
      await prisma.savedLocation.delete({ where: { id: existing.id } })
      return res.json({ saved: false })
    }

    try {
      await prisma.savedLocation.create({ data: { userId, locationId: id } })
    } catch (err) {
      // Concurrent double-save loses the unique race — treat as already saved.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return res.json({ saved: true })
      }
      throw err
    }
    return res.json({ saved: true })
  } catch (err) {
    next(err)
  }
})

// List the current user's saved locations, newest first, thumbnail-enriched
// (same thumbnail resolution as GET /api/locations).
router.get('/saved/locations', authenticate, async (_req, res, next) => {
  try {
    const saved = await prisma.savedLocation.findMany({
      where: { userId: _req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          include: {
            model: true,
            _count: { select: { images: true } },
            thumbnailImage: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
      },
    })

    res.json({
      locations: saved.map(({ location }) => {
        const { images, thumbnailImage, ...loc } = location
        return { ...loc, thumbnail: thumbnailImage ?? images[0] ?? null }
      }),
    })
  } catch (err) {
    next(err)
  }
})

export default router
