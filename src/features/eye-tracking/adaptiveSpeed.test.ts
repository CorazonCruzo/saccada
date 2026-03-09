import { describe, it, expect } from 'vitest'
import {
  createAdaptiveSpeedState,
  updateAdaptiveSpeed,
} from './adaptiveSpeed'

function makeGaze(x: number, y: number) {
  return { x, y, t: 0 }
}

const W = 1000
const H = 800
// diagonal ≈ 1280.6
const INTERVAL = 100 // CHECK_INTERVAL_MS

describe('adaptiveSpeed', () => {
  describe('createAdaptiveSpeedState', () => {
    it('initializes with multiplier 1.0', () => {
      const state = createAdaptiveSpeedState()
      expect(state.multiplier).toBe(1.0)
      expect(state.smoothedDistance).toBe(0)
      expect(state.lastCheckTime).toBe(0)
    })
  })

  describe('updateAdaptiveSpeed', () => {
    it('returns 1.0 when gaze is null', () => {
      const state = createAdaptiveSpeedState()
      const m = updateAdaptiveSpeed(state, 300, null, 500, 400, W, H)
      expect(m).toBe(1.0)
    })

    it('does not check more frequently than 100ms', () => {
      const state = createAdaptiveSpeedState()
      updateAdaptiveSpeed(state, 100, makeGaze(0, 0), 500, 400, W, H)
      const m = updateAdaptiveSpeed(state, 150, makeGaze(0, 0), 500, 400, W, H)
      expect(state.lastCheckTime).toBe(100) // second call skipped
      // multiplier should reflect only the first check
      expect(m).toBe(state.multiplier)
    })

    it('keeps multiplier at 1.0 when gaze is on the dot', () => {
      const state = createAdaptiveSpeedState()
      for (let t = INTERVAL; t <= 2000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 500, 400, W, H)
      }
      expect(state.multiplier).toBe(1.0)
    })

    it('smoothedDistance converges toward actual distance', () => {
      const state = createAdaptiveSpeedState()
      for (let t = INTERVAL; t <= 2000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      expect(state.smoothedDistance).toBeGreaterThan(0.7)
    })

    it('maps smoothed distance directly to multiplier (no steps)', () => {
      const state = createAdaptiveSpeedState()
      // After several checks with large distance, multiplier should track directly
      for (let t = INTERVAL; t <= 1000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      // Multiplier should be below 1.0 and above MIN (0.4)
      expect(state.multiplier).toBeLessThan(1.0)
      expect(state.multiplier).toBeGreaterThanOrEqual(0.4)

      // Check it's proportionally mapped: higher smoothedDistance → lower multiplier
      const m1 = state.multiplier
      updateAdaptiveSpeed(state, 1100, makeGaze(0, 0), 900, 700, W, H)
      expect(state.multiplier).toBeLessThanOrEqual(m1)
    })

    it('reaches MIN_MULTIPLIER (0.4) when gaze is far', () => {
      const state = createAdaptiveSpeedState()
      for (let t = INTERVAL; t <= 5000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      expect(state.multiplier).toBe(0.4)
    })

    it('recovers toward 1.0 when gaze catches up', () => {
      const state = createAdaptiveSpeedState()
      // Create lag
      for (let t = INTERVAL; t <= 1000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      const slowedMultiplier = state.multiplier
      expect(slowedMultiplier).toBeLessThan(1.0)

      // Gaze catches up
      for (let t = 1100; t <= 3000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 500, 400, W, H)
      }
      expect(state.multiplier).toBeGreaterThan(slowedMultiplier)
    })

    it('does not exceed MAX_MULTIPLIER (1.0)', () => {
      const state = createAdaptiveSpeedState()
      state.multiplier = 0.98
      state.smoothedDistance = 0.01
      state.lastCheckTime = 0
      updateAdaptiveSpeed(state, INTERVAL, makeGaze(500, 400), 500, 400, W, H)
      expect(state.multiplier).toBe(1.0)
    })

    it('is robust to occasional noisy close readings during lag', () => {
      const state = createAdaptiveSpeedState()
      for (let t = INTERVAL; t <= 3000; t += INTERVAL) {
        const isFar = t % 500 !== 0
        const gaze = isFar ? makeGaze(0, 0) : makeGaze(900, 700)
        updateAdaptiveSpeed(state, t, gaze, 900, 700, W, H)
      }
      expect(state.multiplier).toBeLessThan(0.9)
    })

    it('responds faster than old step-based approach', () => {
      const state = createAdaptiveSpeedState()
      // After just 3 checks (300ms) with large distance, should already slow
      for (let t = INTERVAL; t <= 300; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      expect(state.multiplier).toBeLessThan(1.0)
    })

    it('handles zero-size viewport gracefully', () => {
      const state = createAdaptiveSpeedState()
      const m = updateAdaptiveSpeed(state, INTERVAL, makeGaze(0, 0), 0, 0, 0, 0)
      expect(m).toBe(1.0)
    })

    it('slows less when dot moves in smaller area (low visualScale)', () => {
      // visualScale=0.5: dot at (600, 500) instead of far corner,
      // gaze at center (500, 400) — small pixel distance
      const stateSmall = createAdaptiveSpeedState()
      for (let t = INTERVAL; t <= 2000; t += INTERVAL) {
        updateAdaptiveSpeed(stateSmall, t, makeGaze(500, 400), 600, 500, W, H)
      }

      // visualScale=1.0: dot at (900, 700), gaze at center — large pixel distance
      const stateLarge = createAdaptiveSpeedState()
      for (let t = INTERVAL; t <= 2000; t += INTERVAL) {
        updateAdaptiveSpeed(stateLarge, t, makeGaze(500, 400), 900, 700, W, H)
      }

      // Smaller trajectory → less slowing (higher multiplier)
      expect(stateSmall.multiplier).toBeGreaterThan(stateLarge.multiplier)
    })

    it('adjusts naturally when dot position changes mid-session (scale change)', () => {
      const state = createAdaptiveSpeedState()

      // Phase 1: large scale — dot far from gaze, should slow down
      for (let t = INTERVAL; t <= 1000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 900, 700, W, H)
      }
      const multiplierFar = state.multiplier
      expect(multiplierFar).toBeLessThan(1.0)

      // Phase 2: user reduces scale — dot now closer to gaze
      for (let t = 1100; t <= 3000; t += INTERVAL) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 550, 430, W, H)
      }

      // Should recover toward 1.0
      expect(state.multiplier).toBeGreaterThan(multiplierFar)
    })
  })
})
