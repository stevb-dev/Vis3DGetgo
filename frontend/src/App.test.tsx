import { describe, expect, it } from 'vitest'
import { createRoutesFromChildren, matchRoutes } from 'react-router-dom'
import { appRoutes } from './routes'

// Route coverage at the matching seam: App renders exactly `appRoutes` inside
// <Routes>, so a URL that matches nothing renders a blank page under the header.
const routes = createRoutesFromChildren(appRoutes)

describe('app route coverage', () => {
  it('matches the map home', () => {
    expect(matchRoutes(routes, '/')).not.toBeNull()
  })

  it('matches the map for the bare /locations URL (user-typed, no params)', () => {
    const match = matchRoutes(routes, '/locations')
    expect(match).not.toBeNull()
    const leaf = match?.[match.length - 1]
    expect(leaf?.route.path).toBe('/locations')
  })

  it('matches a location detail sidebar', () => {
    expect(matchRoutes(routes, '/locations/1017')).not.toBeNull()
  })

  it('matches the create panel', () => {
    expect(matchRoutes(routes, '/locations/new')).not.toBeNull()
  })
})
