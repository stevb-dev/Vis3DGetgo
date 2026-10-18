import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Recenter } from './mapEffects'

// The seam under test is the sequence of map calls `Recenter` makes:
// `setView(center)` vs `flyTo(target, 15)` across center/flyTo transitions.
const map = vi.hoisted(() => ({ flyTo: vi.fn(), setView: vi.fn() }))

vi.mock('react-leaflet', () => ({
  useMap: () => map,
}))

const HOME: [number, number] = [41.9, 21.3]
const TARGET: [number, number] = [42.0, 21.39]

describe('Recenter', () => {
  beforeEach(() => {
    map.flyTo.mockClear()
    map.setView.mockClear()
  })

  it('sets the initial view on mount (no fly target)', () => {
    render(<Recenter center={HOME} flyTo={null} />)
    expect(map.setView).toHaveBeenCalledTimes(1)
    expect(map.setView).toHaveBeenCalledWith(HOME)
    expect(map.flyTo).not.toHaveBeenCalled()
  })

  it('flies to the target when one appears (search select → ?fly=1)', () => {
    const { rerender } = render(<Recenter center={HOME} flyTo={null} />)
    rerender(<Recenter center={HOME} flyTo={TARGET} />)
    expect(map.flyTo).toHaveBeenCalledWith(TARGET, 15, { duration: 0.8 })
  })

  it('does NOT recenter when the fly target clears (marker click after a search fly)', () => {
    const { rerender } = render(<Recenter center={HOME} flyTo={TARGET} />)
    map.setView.mockClear()
    map.flyTo.mockClear()
    rerender(<Recenter center={HOME} flyTo={null} />)
    // Marker clicks drop ?fly=1 deliberately; the map must stay where the fly left it.
    expect(map.setView).not.toHaveBeenCalled()
    expect(map.flyTo).not.toHaveBeenCalled()
  })

  it('recenters when the center changes before any fly (late geolocation resolve)', () => {
    const { rerender } = render(<Recenter center={HOME} flyTo={null} />)
    map.setView.mockClear()
    rerender(<Recenter center={TARGET} flyTo={null} />)
    expect(map.setView).toHaveBeenCalledWith(TARGET)
  })

  it('lets an active fly win over a late center change', () => {
    const { rerender } = render(<Recenter center={HOME} flyTo={TARGET} />)
    map.setView.mockClear()
    rerender(<Recenter center={TARGET} flyTo={TARGET} />)
    expect(map.setView).not.toHaveBeenCalled()
  })
})
