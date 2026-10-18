import type { Location, NavigationType } from 'react-router-dom'

/**
 * App-level navigation tracker (back-to-map feature).
 *
 * react-router exposes no way to inspect the *previous* history entry, so App
 * records every navigation here and components can ask "where did I come
 * from?". The stack mirrors browser history: PUSH appends, REPLACE swaps the
 * top, POP truncates to the matching entry (or reseeds when the entry was
 * never seen, e.g. browser forward after a redirect).
 */

type Entry = { key: string; pathname: string }

let stack: Entry[] = []

export function trackLocation(location: Location, action: NavigationType): void {
  const top = stack[stack.length - 1]

  // Idempotent for StrictMode's double effect invocation on mount.
  if (top && top.key === location.key && top.pathname === location.pathname) return

  switch (action) {
    case 'PUSH':
      stack.push({ key: location.key, pathname: location.pathname })
      break
    case 'REPLACE': {
      const next = { key: location.key, pathname: location.pathname }
      if (stack.length > 0) stack[stack.length - 1] = next
      else stack.push(next)
      break
    }
    case 'POP': {
      const idx = stack.findIndex((e) => e.key === location.key)
      stack =
        idx >= 0
          ? stack.slice(0, idx + 1)
          : [{ key: location.key, pathname: location.pathname }]
      break
    }
  }
}

/** Pathname of the previous in-app entry, or null on a direct page load. */
export function getPreviousPathname(): string | null {
  return stack.length >= 2 ? stack[stack.length - 2].pathname : null
}

/** The map page or a map page with a nested panel (detail sidebar / create). */
export function isMapPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/locations/')
}
