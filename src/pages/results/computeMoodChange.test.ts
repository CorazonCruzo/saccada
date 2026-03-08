import { describe, it, expect } from 'vitest'
import { computeMoodChange } from './ResultsPage'

// Scale: 1 = calm (good) .. 5 = restless (bad)
// Decrease in number = moved toward calm = improved

describe('computeMoodChange', () => {
  describe('improvement (number decreased = calmer)', () => {
    it('4 -> 3: restless to moderate = improved', () => {
      const r = computeMoodChange(4, 3)
      expect(r.direction).toBe('improved')
      expect(r.color).toBe('text-teal')
      expect(r.arrow).toBe('\u2191')
    })

    it('5 -> 1: very restless to very calm = improved', () => {
      const r = computeMoodChange(5, 1)
      expect(r.direction).toBe('improved')
    })

    it('3 -> 2: moderate to calm = improved', () => {
      const r = computeMoodChange(3, 2)
      expect(r.direction).toBe('improved')
    })

    it('2 -> 1: calm to very calm = improved', () => {
      const r = computeMoodChange(2, 1)
      expect(r.direction).toBe('improved')
    })
  })

  describe('worsened (number increased = more restless)', () => {
    it('3 -> 4: moderate to restless = worsened', () => {
      const r = computeMoodChange(3, 4)
      expect(r.direction).toBe('worsened')
      expect(r.color).toBe('text-lotus')
      expect(r.arrow).toBe('\u2193')
    })

    it('1 -> 5: very calm to very restless = worsened', () => {
      const r = computeMoodChange(1, 5)
      expect(r.direction).toBe('worsened')
    })

    it('2 -> 3: calm to moderate = worsened', () => {
      const r = computeMoodChange(2, 3)
      expect(r.direction).toBe('worsened')
    })
  })

  describe('same (no change)', () => {
    it('3 -> 3: same level', () => {
      const r = computeMoodChange(3, 3)
      expect(r.direction).toBe('same')
      expect(r.color).toBe('text-text-muted')
      expect(r.arrow).toBe('')
    })

    it('1 -> 1: both calm', () => {
      const r = computeMoodChange(1, 1)
      expect(r.direction).toBe('same')
    })

    it('5 -> 5: both restless', () => {
      const r = computeMoodChange(5, 5)
      expect(r.direction).toBe('same')
    })
  })

  describe('missing values', () => {
    it('before only: hasBoth is false, direction is same', () => {
      const r = computeMoodChange(3, undefined)
      expect(r.hasBoth).toBe(false)
      expect(r.direction).toBe('same')
    })

    it('after only: hasBoth is false, direction is same', () => {
      const r = computeMoodChange(undefined, 2)
      expect(r.hasBoth).toBe(false)
      expect(r.direction).toBe('same')
    })

    it('both undefined: hasBoth is false', () => {
      const r = computeMoodChange(undefined, undefined)
      expect(r.hasBoth).toBe(false)
      expect(r.direction).toBe('same')
    })
  })

  describe('hasBoth flag', () => {
    it('true when both values provided', () => {
      expect(computeMoodChange(2, 4).hasBoth).toBe(true)
    })

    it('false when before is undefined', () => {
      expect(computeMoodChange(undefined, 3).hasBoth).toBe(false)
    })

    it('false when after is undefined', () => {
      expect(computeMoodChange(3, undefined).hasBoth).toBe(false)
    })
  })
})
