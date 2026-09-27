import { describe, expect, it, vi } from 'vitest'
import { csrfCheck } from './csrfCheck'

function run(origin: string | undefined, host = 'localhost:5173') {
  const req = { headers: { origin, host } } as never
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as never
  const next = vi.fn()
  csrfCheck(req as never, res as never, next)
  return { res, next }
}

describe('csrfCheck', () => {
  it('allows requests without an Origin header (non-browser clients)', () => {
    const { next, res } = run(undefined)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows same-host origins regardless of port', () => {
    const cases: Array<[string, string]> = [
      ['http://localhost', 'localhost'],
      ['http://localhost:5173', 'localhost'],
      ['http://localhost:80', 'localhost:80'],
      ['http://127.0.0.1:5173', '127.0.0.1'],
      ['http://192.168.1.10', '192.168.1.10:80'],
    ]
    for (const [origin, host] of cases) {
      const { next, res } = run(origin, host)
      expect(next, `origin ${origin} host ${host}`).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    }
  })

  it('rejects cross-site origins', () => {
    const { next, res } = run('https://evil.example')
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects unparseable origins', () => {
    const { next, res } = run('not a url')
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
})
