import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { reportBodySchema, resolveReportSchema } from '../lib/schemas'
import { authenticate, requireAdmin } from '../middleware/authenticate'

const router = Router()

// ── User reporting (junk content → admin review) ────────────────────────────
// Grilling decision: images AND locations, category-based, reporter named but
// visible to admins only, one report per reporter per target.

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

router.post('/images/:id/report', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const image = await prisma.image.findUnique({ where: { id } })
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }
    if (image.userId === req.userId) {
      return res.status(400).json({ error: 'You cannot report your own image' })
    }

    const { category } = reportBodySchema.parse(req.body)
    const report = await prisma.report.create({
      data: { category, imageId: id, reporterId: req.userId as number },
    })
    res.status(201).json({ report })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'You have already reported this image' })
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

router.post('/locations/:id/report', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const location = await prisma.location.findUnique({ where: { id } })
    if (!location) {
      return res.status(404).json({ error: 'Location not found' })
    }
    if (location.userId === req.userId) {
      return res.status(400).json({ error: 'You cannot report your own location' })
    }

    const { category } = reportBodySchema.parse(req.body)
    const report = await prisma.report.create({
      data: { category, locationId: id, reporterId: req.userId as number },
    })
    res.status(201).json({ report })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'You have already reported this location' })
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

// ── Admin review ────────────────────────────────────────────────────────────

router.get('/reports', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'
    const reports = await prisma.report.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: {
        image: { select: { id: true, filePath: true, locationId: true } },
        location: { select: { id: true, name: true } },
        reporter: { select: { id: true, username: true } },
      },
    })
    res.json({ reports })
  } catch (err) {
    next(err)
  }
})

router.patch('/reports/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const { status } = resolveReportSchema.parse(req.body)
    const report = await prisma.report.update({
      where: { id },
      data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null },
    })
    res.json({ report })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Report not found' })
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.flatten() })
    }
    next(err)
  }
})

export default router
