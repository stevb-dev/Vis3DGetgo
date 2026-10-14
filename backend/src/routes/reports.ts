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

    const image = await prisma.image.findFirst({ where: { id, deletedAt: null } })
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

    const location = await prisma.location.findFirst({ where: { id, deletedAt: null } })
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

// List filter (report-resolution/03): OPEN or CLOSED (RESOLVED + DISMISSED).
// Unknown/absent status defaults to OPEN. The include is the moderation view —
// it deliberately does NOT filter soft-deleted targets (admins need the context).
router.get('/reports', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const raw = req.query.status
    const where: Prisma.ReportWhereInput =
      raw === 'CLOSED' ? { status: { in: ['RESOLVED', 'DISMISSED'] } } : { status: 'OPEN' }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        image: { select: { id: true, filePath: true, locationId: true, deletedAt: true } },
        location: { select: { id: true, name: true, deletedAt: true } },
        reporter: { select: { id: true, username: true } },
      },
    })
    res.json({ reports })
  } catch (err) {
    next(err)
  }
})

// Unread count for the admin badge (report-resolution/06): OPEN reports created
// after the admin's last visit to /admin/reports (lastSeenReportsAt). A never-
// visited admin (null) sees every OPEN report as unread.
router.get('/reports/unread-count', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { lastSeenReportsAt: true },
    })
    const cutoff = user?.lastSeenReportsAt ?? new Date(0)
    const count = await prisma.report.count({
      where: { status: 'OPEN', createdAt: { gt: cutoff } },
    })
    res.json({ count })
  } catch (err) {
    next(err)
  }
})

// Mark reports seen (report-resolution/06): resets the admin's unread watermark.
router.post('/reports/seen', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { lastSeenReportsAt: new Date() },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Two-action resolution (report-resolution/02): DELETE soft-deletes the target
// (+ cascade + sibling auto-close + owner notification) or DISMISS just closes
// the report. All multi-step work runs in a single transaction.
router.patch('/reports/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const { action, note } = resolveReportSchema.parse(req.body)
    const normalizedNote = note || null // empty/absent note → NULL, not ''

    const existing = await prisma.report.findUnique({
      where: { id },
      include: { image: true, location: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Report not found' })
    }

    const report = await prisma.$transaction(async (tx) => {
      if (action === 'DISMISS') {
        return tx.report.update({
          where: { id },
          data: { status: 'DISMISSED', closedAt: new Date(), note: normalizedNote },
        })
      }

      // DELETE: resolve the target and soft-delete it.
      let ownerId: number | null = null
      let contentName: string | null = null

      if (existing.imageId !== null) {
        const image = existing.image
        if (image) {
          ownerId = image.userId
          contentName = image.originalName
          await tx.image.update({ where: { id: image.id }, data: { deletedAt: new Date() } })

          // Clear the pin if this image was the location's pinned thumbnail.
          const location = await tx.location.findUnique({
            where: { id: image.locationId },
            select: { thumbnailImageId: true },
          })
          if (location?.thumbnailImageId === image.id) {
            await tx.location.update({
              where: { id: image.locationId },
              data: { thumbnailImageId: null },
            })
          }
        }
        // Auto-close sibling OPEN reports on the same image.
        await tx.report.updateMany({
          where: { imageId: existing.imageId, status: 'OPEN', id: { not: existing.id } },
          data: { status: 'RESOLVED', closedAt: new Date(), note: null },
        })
      } else if (existing.locationId !== null) {
        const location = existing.location
        if (location) {
          ownerId = location.userId
          contentName = location.name
          await tx.location.update({
            where: { id: location.id },
            data: { deletedAt: new Date(), thumbnailImageId: null },
          })

          // Cascade the soft-delete to every child image and auto-close their
          // OPEN reports (grilling decision: no owner notification for these).
          const childImageIds = (
            await tx.image.findMany({ where: { locationId: location.id }, select: { id: true } })
          ).map((img) => img.id)
          if (childImageIds.length > 0) {
            await tx.image.updateMany({
              where: { locationId: location.id },
              data: { deletedAt: new Date() },
            })
            await tx.report.updateMany({
              where: { imageId: { in: childImageIds }, status: 'OPEN' },
              data: { status: 'RESOLVED', closedAt: new Date(), note: null },
            })
          }
        }
        // Auto-close sibling OPEN reports on the same location.
        await tx.report.updateMany({
          where: { locationId: existing.locationId, status: 'OPEN', id: { not: existing.id } },
          data: { status: 'RESOLVED', closedAt: new Date(), note: null },
        })
      }

      const updated = await tx.report.update({
        where: { id },
        data: { status: 'RESOLVED', closedAt: new Date(), note: normalizedNote },
      })

      // Notify the content owner (snapshot-based; skip when there is no owner).
      if (ownerId !== null && contentName !== null) {
        await tx.notification.create({
          data: {
            userId: ownerId,
            type: 'MODERATION_REMOVAL',
            contentName,
            category: existing.category,
            note: normalizedNote,
          },
        })
      }

      return updated
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

// Reporter's own reports (report-resolution/07): a plain list, no unread marker.
router.get('/my-reports', authenticate, async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { reporterId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        image: { select: { id: true, originalName: true, filePath: true, locationId: true, deletedAt: true } },
        location: { select: { id: true, name: true, deletedAt: true } },
      },
    })
    res.json({ reports })
  } catch (err) {
    next(err)
  }
})

export default router
