import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './lib/config'
import authRoutes from './routes/auth'
import locationRoutes from './routes/locations'
import imageRoutes from './routes/images'
import modelRoutes from './routes/models'
import { notFound, errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: config.corsOrigin.split(','), credentials: true }))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/locations', locationRoutes)
  app.use('/api', imageRoutes) // mounts /api/locations/:id/images and /api/images/:id
  app.use('/api/models', modelRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
