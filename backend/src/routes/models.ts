import { Request, Response, Router } from 'express'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import { prisma } from '../lib/prisma'
import { config } from '../lib/config'
import { modelFormatFromFilename, uploadModel } from '../lib/models'
import { authenticate, requireAdmin } from '../middleware/authenticate'

const router = Router()

// ── Register a model (admin) ────────────────────────────────────────────────
// .scratch/models-3d/issues/01. Grilling round: a single multipart endpoint
// (locationId + one .glb/.spz file), 409 on an existing model, ≤ MAX_MODEL_MB,
// and a separate DELETE to unregister. The server writes <uuid>.<ext> into the
// models volume, so a client-supplied filename can never path-traverse.

router.post('/', authenticate, requireAdmin, (req: Request, res: Response, next) => {
  uploadModel(req, res, (err: unknown) => {
    if (err) {
      return res.status(400).json({ error: describeModelUploadError(err) })
    }
    handleModelUpload(req, res).catch(next)
  })
})

async function handleModelUpload(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'No file provided' })
    return
  }

  // locationId arrives as a multipart text field (string) — coerce + validate.
  const locationId = Number(req.body?.locationId)
  if (!Number.isInteger(locationId) || locationId <= 0) {
    res.status(400).json({ error: 'locationId is required and must be a positive integer' })
    return
  }

  const location = await prisma.location.findFirst({
    where: { id: locationId, deletedAt: null },
    include: { model: true },
  })
  if (!location) {
    res.status(404).json({ error: 'Location not found' })
    return
  }
  if (location.model) {
    res.status(409).json({ error: 'This location already has a model' })
    return
  }

  // The file filter already guaranteed a recognized extension; this is a guard.
  const format = modelFormatFromFilename(file.originalname)
  if (!format) {
    res.status(400).json({ error: 'Unsupported file type. Allowed extensions: .glb, .spz' })
    return
  }

  const filename = `${uuidv4()}.${format === 'GLB' ? 'glb' : 'spz'}`
  await fs.promises.writeFile(path.join(config.modelsDir, filename), file.buffer)

  try {
    const model = await prisma.model.create({
      data: {
        locationId,
        filename,
        filePath: `/models/${filename}`,
        fileSize: file.size,
        format,
      },
    })
    res.status(201).json({ model })
  } catch (err) {
    // DB failure after write: unlink the fresh file so no orphan models remain.
    await fs.promises.rm(path.join(config.modelsDir, filename), { force: true }).catch(() => undefined)
    throw err
  }
}

function describeModelUploadError(err: unknown): string {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return `File too large (max ${config.maxModelMb} MB)`
    }
    return err.message
  }
  if (err instanceof Error) return err.message // includes the fileFilter message
  return 'Invalid upload'
}

// ── Unregister a model (admin) ──────────────────────────────────────────────
// Hard delete + best-effort file unlink. Models are admin-managed content, not
// user content, so the moderation soft-delete does not apply here.
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' })
    }

    const model = await prisma.model.findUnique({ where: { id } })
    if (!model) {
      return res.status(404).json({ error: 'Model not found' })
    }

    await prisma.model.delete({ where: { id } })

    await fs.promises.rm(path.join(config.modelsDir, model.filename), { force: true }).catch(() => undefined)

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
