import { NextFunction, Request, Response } from 'express'

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}

interface HttpError {
  statusCode?: number
  status?: number
}

// Express recognizes error handlers by their 4-argument signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const e = err as HttpError
  const status =
    typeof e?.statusCode === 'number' ? e.statusCode : typeof e?.status === 'number' ? e.status : 500

  // Only log genuine server faults; 4xx errors (e.g. malformed JSON) are expected.
  if (status >= 500) {
    console.error('[api] unhandled error:', err)
  }

  res.status(status).json({ error: status >= 500 ? 'Internal server error' : 'Invalid request' })
}
