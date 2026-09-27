import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/authenticate'

const router = Router()

// Admin-only model registration is tracked in .scratch/models-3d/issues/01-model-registration-admin-api.md
router.post('/', authenticate, requireAdmin, (_req, res) => {
  res.status(501).json({
    error: 'Not implemented yet',
    ticket: '.scratch/models-3d/issues/01-model-registration-admin-api.md',
  })
})

export default router
