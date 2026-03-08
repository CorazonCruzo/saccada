import { describe, it, expect } from 'vitest'
import {
  createAdaptiveSpeedState,
  updateAdaptiveSpeed,
  type AdaptiveSpeedState,
} from './adaptiveSpeed'

function makeGaze(x: number, y: number) {
  return { x, y, t: 0 }
}

const W = 1000
const H = 800

describe('adaptiveSpeed', () => {
  describe('createAdaptiveSpeedState', () => {
    it('initializes with multiplier 1.0', () => {
      const state = createAdaptiveSpeedState()
      expect(state.multiplier).toBe(1.0)
      expect(state.consecutiveLag).toBe(0)
      expect(state.lastCheckTime).toBe(0)
    })
  })

  describe('updateAdaptiveSpeed', () => {
    it('returns 1.0 when gaze is null', () => {
      const state = createAdaptiveSpeedState()
      const m = updateAdaptiveSpeed(state, 300, null, 500, 400, W, H)
      expect(m).toBe(1.0)
    })

    it('does not check more frequently than 200ms', () => {
      const state = createAdaptiveSpeedState()
      // First check at t=200
      updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 500, 400, W, H)
      // Try again at t=300 (only 100ms later)
      const m = updateAdaptiveSpeed(state, 300, makeGaze(0, 0), 500, 400, W, H)
      expect(m).toBe(1.0) // should not have checked yet
      expect(state.lastCheckTime).toBe(200)
    })

    it('keeps multiplier at 1.0 when gaze is close to dot', () => {
      const state = createAdaptiveSpeedState()
      // Gaze right on the dot
      for (let t = 200; t <= 2000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 500, 400, W, H)
      }
      expect(state.multiplier).toBe(1.0)
      expect(state.consecutiveLag).toBe(0)
    })

    it('does not slow down immediately on single lag', () => {
      const state = createAdaptiveSpeedState()
      // Gaze far from dot (one check)
      updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 900, 700, W, H)
      expect(state.consecutiveLag).toBe(1)
      expect(state.multiplier).toBe(1.0) // not yet
    })

    it('slows down after 3 consecutive lag checks', () => {
      const state = createAdaptiveSpeedState()
      // Three consecutive checks with gaze far from dot
      // diagonal = sqrt(1e6 + 640000) = ~1280, 20% = ~256px
      // dot at (900,700), gaze at (0,0) — distance ~1140, well above threshold
      updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 900, 700, W, H)
      updateAdaptiveSpeed(state, 400, makeGaze(0, 0), 900, 700, W, H)
      updateAdaptiveSpeed(state, 600, makeGaze(0, 0), 900, 700, W, H)
      expect(state.consecutiveLag).toBe(3)
      expect(state.multiplier).toBe(0.9)
    })

    it('continues slowing down on more lag', () => {
      const state = createAdaptiveSpeedState()
      for (let t = 200; t <= 1200; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      // 6 checks, first slowdown at check 3, then 4, 5, 6
      expect(state.multiplier).toBeCloseTo(0.6)
    })

    it('does not go below MIN_MULTIPLIER (0.3)', () => {
      const state = createAdaptiveSpeedState()
      for (let t = 200; t <= 5000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      expect(state.multiplier).toBe(0.3)
    })

    it('speeds up when gaze catches up', () => {
      const state = createAdaptiveSpeedState()
      // Slow down first
      for (let t = 200; t <= 1200; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      const slowedMultiplier = state.multiplier
      expect(slowedMultiplier).toBeLessThan(1.0)

      // Now gaze catches up (right on dot)
      let t = 1400
      updateAdaptiveSpeed(state, t, makeGaze(500, 400), 500, 400, W, H)
      expect(state.consecutiveLag).toBe(0)
      expect(state.multiplier).toBeGreaterThan(slowedMultiplier)
    })

    it('does not exceed MAX_MULTIPLIER (1.0) when speeding up', () => {
      const state = createAdaptiveSpeedState()
      state.multiplier = 0.98
      state.lastCheckTime = 0
      updateAdaptiveSpeed(state, 200, makeGaze(500, 400), 500, 400, W, H)
      expect(state.multiplier).toBe(1.0)
    })

    it('resets consecutive lag counter when gaze is close', () => {
      const state = createAdaptiveSpeedState()
      // Two lags
      updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 900, 700, W, H)
      updateAdaptiveSpeed(state, 400, makeGaze(0, 0), 900, 700, W, H)
      expect(state.consecutiveLag).toBe(2)

      // Gaze catches up — resets counter
      updateAdaptiveSpeed(state, 600, makeGaze(500, 400), 500, 400, W, H)
      expect(state.consecutiveLag).toBe(0)
    })

    it('handles zero-size viewport gracefully', () => {
      const state = createAdaptiveSpeedState()
      const m = updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 0, 0, 0, 0)
      expect(m).toBe(1.0)
    })
  })
})
