import { describe, it, expect } from 'vitest'
import { getTrajectoryPosition, toCanvasCoords } from './trajectories'
import type { TrajectoryParams } from '@/entities/pattern'

const defaultParams: TrajectoryParams = {
  amplitude: 0.8,
  easing: 'linear',
}

describe('getTrajectoryPosition', () => {
  describe('fixation', () => {
    it('always returns center', () => {
      expect(getTrajectoryPosition(0, 'fixation', defaultParams)).toEqual({ x: 0, y: 0 })
      expect(getTrajectoryPosition(0.5, 'fixation', defaultParams)).toEqual({ x: 0, y: 0 })
      expect(getTrajectoryPosition(1, 'fixation', defaultParams)).toEqual({ x: 0, y: 0 })
    })
  })

  describe('horizontal', () => {
    it('y is always 0', () => {
      for (let t = 0; t <= 1; t += 0.25) {
        expect(getTrajectoryPosition(t, 'horizontal', defaultParams).y).toBe(0)
      }
    })

    it('x scales with amplitude', () => {
      const p1 = getTrajectoryPosition(0.5, 'horizontal', { amplitude: 0.5, easing: 'linear' })
      const p2 = getTrajectoryPosition(0.5, 'horizontal', { amplitude: 1.0, easing: 'linear' })
      expect(Math.abs(p2.x)).toBeGreaterThan(Math.abs(p1.x))
    })

    it('x stays within [-amplitude, amplitude]', () => {
      for (let t = 0; t <= 1; t += 0.05) {
        const { x } = getTrajectoryPosition(t, 'horizontal', defaultParams)
        expect(Math.abs(x)).toBeLessThanOrEqual(defaultParams.amplitude + 0.001)
      }
    })
  })

  describe('vertical', () => {
    it('x is always 0 (no bias)', () => {
      for (let t = 0; t <= 1; t += 0.25) {
        expect(getTrajectoryPosition(t, 'vertical', defaultParams).x).toBe(0)
      }
    })

    it('bias up shifts y negative', () => {
      const params: TrajectoryParams = { amplitude: 0.8, easing: 'sine', bias: 'up' }
      const atPeak = getTrajectoryPosition(0.25, 'vertical', params)
      const noBias = getTrajectoryPosition(0.25, 'vertical', { amplitude: 0.8, easing: 'sine' })
      expect(atPeak.y).toBeLessThan(noBias.y)
    })

    it('bias down shifts y positive', () => {
      const params: TrajectoryParams = { amplitude: 0.8, easing: 'sine', bias: 'down' }
      const atPeak = getTrajectoryPosition(0.25, 'vertical', params)
      const noBias = getTrajectoryPosition(0.25, 'vertical', { amplitude: 0.8, easing: 'sine' })
      expect(atPeak.y).toBeGreaterThan(noBias.y)
    })
  })

  describe('circular', () => {
    it('traces a circle at t=0 (right), t=0.25 (bottom), t=0.5 (left), t=0.75 (top)', () => {
      const amp = 0.8
      const params: TrajectoryParams = { amplitude: amp, easing: 'linear' }

      const p0 = getTrajectoryPosition(0, 'circular', params)
      expect(p0.x).toBeCloseTo(amp)
      expect(p0.y).toBeCloseTo(0)

      const p25 = getTrajectoryPosition(0.25, 'circular', params)
      expect(p25.x).toBeCloseTo(0)
      expect(p25.y).toBeCloseTo(amp)

      const p50 = getTrajectoryPosition(0.5, 'circular', params)
      expect(p50.x).toBeCloseTo(-amp)
      expect(p50.y).toBeCloseTo(0)

      const p75 = getTrajectoryPosition(0.75, 'circular', params)
      expect(p75.x).toBeCloseTo(0)
      expect(p75.y).toBeCloseTo(-amp)
    })

    it('all points are at same distance from center', () => {
      const amp = 0.6
      const params: TrajectoryParams = { amplitude: amp, easing: 'linear' }
      for (let t = 0; t < 1; t += 0.1) {
        const p = getTrajectoryPosition(t, 'circular', params)
        const dist = Math.sqrt(p.x * p.x + p.y * p.y)
        expect(dist).toBeCloseTo(amp)
      }
    })
  })

  describe('diagonal', () => {
    it('x and y have opposite signs', () => {
      const p = getTrajectoryPosition(0.5, 'diagonal', defaultParams)
      if (p.x !== 0) {
        expect(Math.sign(p.x)).toBe(-Math.sign(p.y))
      }
    })

    it('at t=0 returns origin', () => {
      const p = getTrajectoryPosition(0, 'diagonal', defaultParams)
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(0)
    })
  })

  describe('figure8', () => {
    it('returns origin at t=0', () => {
      const p = getTrajectoryPosition(0, 'figure8', defaultParams)
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(0)
    })

    it('returns origin at t=1 (full cycle)', () => {
      const p = getTrajectoryPosition(1, 'figure8', defaultParams)
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(0)
    })

    it('y amplitude is smaller than x amplitude (0.6 factor)', () => {
      let maxX = 0
      let maxY = 0
      for (let t = 0; t < 1; t += 0.01) {
        const p = getTrajectoryPosition(t, 'figure8', defaultParams)
        maxX = Math.max(maxX, Math.abs(p.x))
        maxY = Math.max(maxY, Math.abs(p.y))
      }
      expect(maxY).toBeLessThan(maxX)
      expect(maxY / maxX).toBeCloseTo(0.6, 1)
    })
  })
})

describe('toCanvasCoords', () => {
  it('maps center (0,0) to canvas center', () => {
    const p = toCanvasCoords({ x: 0, y: 0 }, 1000, 800)
    expect(p.x).toBe(500)
    expect(p.y).toBe(400)
  })

  it('maps (-1,-1) to top-left corner', () => {
    const p = toCanvasCoords({ x: -1, y: -1 }, 1000, 800)
    expect(p.x).toBe(0)
    expect(p.y).toBe(0)
  })

  it('maps (1,1) to bottom-right corner', () => {
    const p = toCanvasCoords({ x: 1, y: 1 }, 1000, 800)
    expect(p.x).toBe(1000)
    expect(p.y).toBe(800)
  })

  it('maps (0.5, -0.5) correctly', () => {
    const p = toCanvasCoords({ x: 0.5, y: -0.5 }, 1000, 800)
    expect(p.x).toBe(750)
    expect(p.y).toBe(200)
  })
})
