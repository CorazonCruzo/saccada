import { describe, it, expect } from 'vitest'
import { applyEasing } from './easing'

describe('applyEasing', () => {
  describe('all easings oscillate in [-1, +1]', () => {
    const easings = ['linear', 'sine', 'ease-in-out'] as const
    for (const easing of easings) {
      it(`${easing} stays within [-1, +1]`, () => {
        for (let t = 0; t <= 1; t += 0.01) {
          const v = applyEasing(t, easing)
          expect(v).toBeGreaterThanOrEqual(-1 - 0.001)
          expect(v).toBeLessThanOrEqual(1 + 0.001)
        }
      })

      it(`${easing} reaches both extremes`, () => {
        let min = Infinity
        let max = -Infinity
        for (let t = 0; t <= 1; t += 0.001) {
          const v = applyEasing(t, easing)
          min = Math.min(min, v)
          max = Math.max(max, v)
        }
        expect(max).toBeGreaterThanOrEqual(0.99)
        expect(min).toBeLessThanOrEqual(-0.99)
      })

      it(`${easing} has both positive and negative values`, () => {
        let hasPositive = false
        let hasNegative = false
        for (let t = 0; t <= 1; t += 0.01) {
          const v = applyEasing(t, easing)
          if (v > 0.1) hasPositive = true
          if (v < -0.1) hasNegative = true
        }
        expect(hasPositive).toBe(true)
        expect(hasNegative).toBe(true)
      })
    }
  })

  describe('linear (triangle wave)', () => {
    it('t=0 → -1 (edge)', () => {
      expect(applyEasing(0, 'linear')).toBeCloseTo(-1)
    })
    it('t=0.25 → 0 (center)', () => {
      expect(applyEasing(0.25, 'linear')).toBeCloseTo(0)
    })
    it('t=0.5 → +1 (opposite edge)', () => {
      expect(applyEasing(0.5, 'linear')).toBeCloseTo(1)
    })
    it('t=0.75 → 0 (center)', () => {
      expect(applyEasing(0.75, 'linear')).toBeCloseTo(0)
    })
    it('t=1 → -1 (back to start)', () => {
      expect(applyEasing(1, 'linear')).toBeCloseTo(-1)
    })
  })

  describe('sine', () => {
    it('t=0 → 0 (center)', () => {
      expect(applyEasing(0, 'sine')).toBeCloseTo(0)
    })
    it('t=0.25 → +1 (peak)', () => {
      expect(applyEasing(0.25, 'sine')).toBeCloseTo(1)
    })
    it('t=0.5 → 0 (center)', () => {
      expect(applyEasing(0.5, 'sine')).toBeCloseTo(0)
    })
    it('t=0.75 → -1 (trough)', () => {
      expect(applyEasing(0.75, 'sine')).toBeCloseTo(-1)
    })
    it('t=1 → 0 (full cycle)', () => {
      expect(applyEasing(1, 'sine')).toBeCloseTo(0)
    })
  })

  describe('ease-in-out (cosine oscillation)', () => {
    it('t=0 → -1 (starts at edge)', () => {
      expect(applyEasing(0, 'ease-in-out')).toBeCloseTo(-1)
    })
    it('t=0.25 → 0 (center, accelerating)', () => {
      expect(applyEasing(0.25, 'ease-in-out')).toBeCloseTo(0)
    })
    it('t=0.5 → +1 (opposite edge, lingers)', () => {
      expect(applyEasing(0.5, 'ease-in-out')).toBeCloseTo(1)
    })
    it('t=0.75 → 0 (center, accelerating back)', () => {
      expect(applyEasing(0.75, 'ease-in-out')).toBeCloseTo(0)
    })
    it('t=1 → -1 (back to start)', () => {
      expect(applyEasing(1, 'ease-in-out')).toBeCloseTo(-1)
    })
  })
})
