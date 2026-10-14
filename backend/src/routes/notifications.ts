import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()

// ── Owner notifications (report-resolution/08) ───────────────────────────────
// In-app, snapshot-based notices for content removed by moderation. No reporter
// identity is ever included — only content name + category + optional note.

router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ notifications })
  } catch (err) {
    next(err)
  }
})

router.post('/notifications/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.get('/notifications/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, readAt: null },
    })
    res.json({ count })
  } catch (err) {
    next(err)
  }
})

export default router
