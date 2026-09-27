import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'

const router = Router()

// Upload pipeline (multer + sharp) is tracked in .scratch/images/issues/01-upload-pipeline-multer-sharp.md
router.post('/locations/:id/images', authenticate, (_req, res) => {
  res.status(501).json({
    error: 'Not implemented yet',
    ticket: '.scratch/images/issues/01-upload-pipeline-multer-sharp.md',
  })
})

// Owner/admin enforcement is tracked in .scratch/images/issues/03-delete-ownership-enforcement.md
router.delete('/images/:id', authenticate, (_req, res) => {
  res.status(501).json({
    error: 'Not implemented yet',
    ticket: '.scratch/images/issues/03-delete-ownership-enforcement.md',
  })
})

export default router
