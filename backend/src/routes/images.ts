import { Request, Response, Router } from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { config } from '../lib/config'
import { mayPickThumbnailOnUpload, ProcessedImage, processImage, uploadImages } from '../lib/images'
import { authenticate } from '../middleware/authenticate'
import { uploadRateLimiter } from '../middleware/uploadRateLimiter'

const router = Router()

// ── Upload pipeline (multer → sharp → volume → row) ─────────────────────────
// .scratch/images/issues/01-upload-pipeline-multer-sharp.md

router.post('/locations/:id/images', authenticate, uploadRateLimiter, (req, res, next) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  // Verify the location BEFORE multer consumes the body, so a 404 doesn't
  // read the whole multipart payload.
  prisma.location
    .findFirst({ where: { id, deletedAt: null }, include: { _count: { select: { images: { where: { deletedAt: null } } } } } })
    .then((location) => {
      if (!location) {
        return res.status(404).json({ error: 'Location not found' })
      }

      uploadImages(req, res, (err: unknown) => {
        if (err) {
          return res.status(400).json({ error: describeUploadError(err) })
        }
        handleUpload(req, res, {
          id,
          existingCount: location._count.images,
          ownerId: location.userId,
        }).catch(next)
      })
    })
    .catch(next)
})

async function handleUpload(
  req: Request,
  res: Response,
  ctx: { id: number; existingCount: number; ownerId: number | null },
): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const userId = req.userId as number
  const role = req.userRole as 'USER' | 'ADMIN'

  if (files.length === 0) {
    res.status(400).json({ error: 'No files provided' })
    return
  }

  const ownerId = ctx.ownerId

  // Optional: designate one file of the batch as the pinned thumbnail.
  // Allowed only on the location creator's initial batch (0 existing images).
  let thumbnailIndex: number | undefined
  if (req.body?.thumbnailIndex !== undefined && req.body.thumbnailIndex !== '') {
    const raw = Number(req.body.thumbnailIndex)
    if (!Number.isInteger(raw) || raw < 0 || raw >= files.length) {
      res.status(400).json({ error: 'thumbnailIndex must be a valid index into the uploaded files' })
      return
    }
    if (
      !mayPickThumbnailOnUpload({
        imageCount: ctx.existingCount,
        requesterId: userId,
        ownerId,
        role,
      })
    ) {
      res.status(400).json({
        error: 'Only the location owner may set the thumbnail on the initial upload',
      })
      return
    }
    thumbnailIndex = raw
  }

  if (ctx.existingCount + files.length > config.maxImagesPerLocation) {
    res.status(400).json({
      error: `This location can hold at most ${config.maxImagesPerLocation} images (${ctx.existingCount} present)`,
    })
    return
  }

  // Optimize all files first (all-or-nothing: a sharp failure rejects the batch).
  const processed: Array<ProcessedImage & { originalName: string }> = []
  for (const file of files) {
    processed.push({
      originalName: file.originalname,
      ...(await processImage(file.buffer)),
    })
  }

  // Write files to the shared volume before touching the DB.
  const written: string[] = []
  try {
    for (const p of processed) {
      const filename = `${uuidv4()}.webp`
      await fs.promises.writeFile(path.join(config.uploadDir, filename), p.buffer)
      written.push(filename)
    }
  } catch (err) {
    await Promise.all(written.map((f) => fs.promises.rm(path.join(config.uploadDir, f), { force: true })))
    throw err
  }

  try {
    const images = await prisma.$transaction(async (tx) => {
      // Row lock serializes concurrent uploads to the same location so
      // order = max + 1 cannot produce ties.
      await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${ctx.id} FOR UPDATE`

      const agg = await tx.image.aggregate({ _max: { order: true }, where: { locationId: ctx.id } })
      let order = (agg._max.order ?? 0) + 1

      const created = []
      for (let i = 0; i < written.length; i++) {
        const row = await tx.image.create({
          data: {
            locationId: ctx.id,
            userId,
            filename: written[i],
            originalName: processed[i].originalName,
            filePath: `/uploads/${written[i]}`,
            fileSize: processed[i].info.size,
            mimeType: 'image/webp',
            order: order++,
          },
        })
        created.push(row)
      }

      if (thumbnailIndex !== undefined) {
        await tx.location.update({
          where: { id: ctx.id },
          data: { thumbnailImageId: created[thumbnailIndex].id },
        })
      }
      return created
    })

    res.status(201).json({ images })
  } catch (err) {
    // DB failure after write: unlink the fresh files so no orphan uploads remain.
    await Promise.all(
      written.map((f) => fs.promises.rm(path.join(config.uploadDir, f), { force: true }).catch(() => undefined)),
    )
    throw err
  }
}

function describeUploadError(err: unknown): string {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return `File too large (max ${config.maxUploadMb} MB per file)`
      case 'LIMIT_FILE_COUNT':
        return 'Too many files (max 10 per upload)'
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected upload field'
      default:
        return err.message
    }
  }
  if (err instanceof Error) return err.message // includes the fileFilter message
  return 'Invalid upload'
}

// ── Delete + ownership enforcement ──────────────────────────────────────────
// .scratch/images/issues/03-delete-ownership-enforcement.md

router.delete('/images/:id', authenticate, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const image = await prisma.image.findFirst({ where: { id, deletedAt: null } })
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Existence is already public via GET /api/locations/:id (image rows are
    // returned to everyone), so 403 is honest and actionable — no need to
    // fake a 404. (Documented decision, ticket 03.)
    const isOwner = image.userId === req.userId
    if (!isOwner && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own images' })
    }

    await prisma.$transaction([
      prisma.image.delete({ where: { id } }),
      // Keep orders contiguous: shift later siblings down one.
      prisma.image.updateMany({
        where: { locationId: image.locationId, order: { gt: image.order } },
        data: { order: { decrement: 1 } },
      }),
    ])

    // Best-effort file cleanup (leftover files are harmless).
    await fs.promises.rm(path.join(config.uploadDir, image.filename), { force: true }).catch(() => undefined)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
