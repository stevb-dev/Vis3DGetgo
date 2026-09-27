import { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/tokens'

declare global {
  namespace Express {
    interface Request {
      userId?: number
      userRole?: 'USER' | 'ADMIN'
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.userId
    req.userRole = payload.role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
