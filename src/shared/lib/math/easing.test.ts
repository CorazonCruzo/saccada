import { describe, it, expect } from 'vitest'
import { applyEasing } from './easing'

describe('applyEasing', () => {
  describe('linear', () => {
    it('returns t unchanged', () => {
      expect(applyEasing(0, 'linear')).toBe(0)
      expect(applyEasing(0.5, 'linear')).toBe(0.5)
      expect(applyEasing(1, 'linear')).toBe(1)
    })
  })

  describe('sine', () => {
    it('returns 0 at t=0', () => {
      expect(applyEasing(0, 'sine')).toBeCloseTo(0)
    })

    it('returns 0 at t=1 (full cycle)', () => {
      expect(applyEasing(1, 'sine')).toBeCloseTo(0)
    })

    it('returns 1 at t=0.25 (peak)', () => {
      expect(applyEasing(0.25, 'sine')).toBeCloseTo(1)
    })

    it('returns -1 at t=0.75 (trough)', () => {
      expect(applyEasing(0.75, 'sine')).toBeCloseTo(-1)
    })

    it('returns 0 at t=0.5 (midpoint)', () => {
      expect(applyEasing(0.5, 'sine')).toBeCloseTo(0)
    })
  })

  describe('ease-in-out', () => {
    it('returns 0 at t=0', () => {
      expect(applyEasing(0, 'ease-in-out')).toBeCloseTo(0)
    })

    it('returns 1 at t=1', () => {
      expect(applyEasing(1, 'ease-in-out')).toBeCloseTo(1)
    })

    it('returns 0.5 at t=0.5 (midpoint)', () => {
      expect(applyEasing(0.5, 'ease-in-out')).toBeCloseTo(0.5)
    })

    it('is slower at start (t=0.25 < 0.25)', () => {
      expect(applyEasing(0.25, 'ease-in-out')).toBeLessThan(0.25)
    })

    it('is faster in middle, slower at end (t=0.75 > 0.75)', () => {
      expect(applyEasing(0.75, 'ease-in-out')).toBeGreaterThan(0.75)
    })

    it('is monotonically increasing', () => {
      let prev = applyEasing(0, 'ease-in-out')
      for (let t = 0.1; t <= 1; t += 0.1) {
        const current = applyEasing(t, 'ease-in-out')
        expect(current).toBeGreaterThanOrEqual(prev)
        prev = current
      }
    })
  })
})
