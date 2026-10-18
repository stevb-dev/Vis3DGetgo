# 06: Pin click after search fly recenters the map to the mount-time center

Status: resolved
Feature: frontend-map

## Context

User report (2026-10-18): use the search bar to find a location, then click
another location pin — the map shifts to "Borce Stan" (the user's own
geolocation center, i.e. where they live) instead of staying on the pin.

## Root cause

`Recenter` (`frontend/src/components/mapEffects.tsx`) treated "fly target
cleared" the same as "initial center arrived":

```ts
useEffect(() => {
  if (flyTo) {
    map.flyTo(flyTo, 15, { duration: 0.8 })
  } else {
    map.setView(center)   // ← ran when flyTo went target → null
  }
}, [center, flyTo, map])
```

Sequence:

1. Search select → `navigate('/locations/:id?fly=1')` → `flyTarget` set → map flies.
2. Pin click → `navigateMap` deliberately drops the transient `?fly=1` (spec:
   marker clicks must not recenter) → `flyTarget` becomes `null`.
3. The effect re-ran and hit the `else` branch → `map.setView(center)` with the
   mount-time `effectiveCenter` (geolocation ≈ user's home ≈ "Borce Stan").

The target of the jump is frozen mount state: `MapPage` reads the initial
viewport in a `useState` initializer and geolocation resolves once, so the
"center" the map was yanked to was never the clicked pin — always the
mount-time position.

## Requirements

- [x] After a fly completes, clearing `?fly=1` (marker click, sidebar close)
      leaves the map where the fly left it — no `setView` fallback.
- [x] A late geolocation resolve still recenters when **no fly has happened**
      (the original reason the `else` branch exists).
- [x] An active fly still wins over a late center change.

## Comments

- 2026-10-18 (agent): Fixed with a `hasFlown` ref in `Recenter` — the
  `setView(center)` fallback only applies before the first fly. Regression
  test added at `frontend/src/components/mapEffects.test.tsx` (first frontend
  test; vitest + @testing-library/react + jsdom added as devDependencies,
  `npm test` script, vitest config in `vite.config.ts`). Loop went red on the
  old code (asserted `setView` called after fly→null) and green on the fix.
  Verified: `npm test` (5/5), `npx tsc --noEmit`, `npm run build`.
