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

    it('does not check more frequently than 200ms', () => {
      const state = createAdaptiveSpeedState()
      updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 500, 400, W, H)
      const m = updateAdaptiveSpeed(state, 300, makeGaze(0, 0), 500, 400, W, H)
      expect(m).toBe(1.0)
      expect(state.lastCheckTime).toBe(200)
    })

    it('keeps multiplier at 1.0 when gaze is on the dot', () => {
      const state = createAdaptiveSpeedState()
      for (let t = 200; t <= 2000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 500, 400, W, H)
      }
      expect(state.multiplier).toBe(1.0)
    })

    it('smoothedDistance converges toward actual distance', () => {
      const state = createAdaptiveSpeedState()
      // Gaze far from dot: distance ≈ 1140px, normalized ≈ 0.89
      for (let t = 200; t <= 2000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      // After 10 EMA updates, smoothedDistance should be close to true distance
      expect(state.smoothedDistance).toBeGreaterThan(0.7)
    })

    it('slows down gradually when gaze lags behind', () => {
      const state = createAdaptiveSpeedState()
      // Sustained lag
      for (let t = 200; t <= 2000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      expect(state.multiplier).toBeLessThan(1.0)
    })

    it('does not go below MIN_MULTIPLIER (0.4)', () => {
      const state = createAdaptiveSpeedState()
      for (let t = 200; t <= 10000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      expect(state.multiplier).toBe(0.4)
    })

    it('speeds up when gaze catches up after lag', () => {
      const state = createAdaptiveSpeedState()
      // Create lag
      for (let t = 200; t <= 2000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(0, 0), 900, 700, W, H)
      }
      const slowedMultiplier = state.multiplier
      expect(slowedMultiplier).toBeLessThan(1.0)

      // Gaze catches up (on dot) — needs several checks for EMA to settle
      for (let t = 2200; t <= 6000; t += 200) {
        updateAdaptiveSpeed(state, t, makeGaze(500, 400), 500, 400, W, H)
      }
      expect(state.multiplier).toBeGreaterThan(slowedMultiplier)
    })

    it('does not exceed MAX_MULTIPLIER (1.0) when speeding up', () => {
      const state = createAdaptiveSpeedState()
      state.multiplier = 0.98
      state.smoothedDistance = 0.01 // already close
      state.lastCheckTime = 0
      updateAdaptiveSpeed(state, 200, makeGaze(500, 400), 500, 400, W, H)
      expect(state.multiplier).toBe(1.0)
    })

    it('holds speed in dead zone between thresholds', () => {
      const state = createAdaptiveSpeedState()
      state.multiplier = 0.8
      // Set smoothedDistance to be between FAST (0.10) and SLOW (0.15)
      state.smoothedDistance = 0.12
      state.lastCheckTime = 0
      // Gaze at a distance that keeps EMA in dead zone
      // distance / diagonal ≈ 0.12 → keeps EMA around 0.12
      const diagonal = Math.sqrt(W * W + H * H)
      const targetDist = 0.12 * diagonal // ≈ 153.7px
      updateAdaptiveSpeed(state, 200, makeGaze(500, 400 + targetDist), 500, 400, W, H)
      expect(state.multiplier).toBe(0.8) // unchanged
    })

    it('is robust to occasional noisy close readings during lag', () => {
      const state = createAdaptiveSpeedState()
      // Mostly far, with occasional close readings
      for (let t = 200; t <= 4000; t += 200) {
        const isFar = t % 1000 !== 0 // close every 5th check
        const gaze = isFar ? makeGaze(0, 0) : makeGaze(900, 700)
        updateAdaptiveSpeed(state, t, gaze, 900, 700, W, H)
      }
      // Should still have slowed down despite occasional close readings
      expect(state.multiplier).toBeLessThan(0.9)
    })

    it('handles zero-size viewport gracefully', () => {
      const state = createAdaptiveSpeedState()
      const m = updateAdaptiveSpeed(state, 200, makeGaze(0, 0), 0, 0, 0, 0)
      expect(m).toBe(1.0)
    })
  })
})
