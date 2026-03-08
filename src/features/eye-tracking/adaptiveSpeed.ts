import type { GazePoint } from './EyeTracker'

/**
 * Adaptive speed controller.
 * Compares gaze position to dot position every check interval.
 * If the user's gaze consistently lags behind the dot, slows it down.
 * If gaze catches up, gradually restores speed (capped at user max).
 */

const CHECK_INTERVAL_MS = 200
const LAG_THRESHOLD = 0.20       // 20% of viewport diagonal
const CONSECUTIVE_LAG_NEEDED = 3 // slow down after 3 consecutive lag checks
const SLOW_DOWN_STEP = 0.10      // reduce multiplier by 10%
const SPEED_UP_STEP = 0.05       // restore 5% per check
const MIN_MULTIPLIER = 0.3
const MAX_MULTIPLIER = 1.0

export interface AdaptiveSpeedState {
  multiplier: number
  consecutiveLag: number
  lastCheckTime: number
}

export function createAdaptiveSpeedState(): AdaptiveSpeedState {
  return {
    multiplier: 1.0,
    consecutiveLag: 0,
    lastCheckTime: 0,
  }
}

/**
 * Call on each animation frame (or at regular intervals).
 * Returns the updated speed multiplier.
 *
 * @param state   Mutable state object (persists between calls)
 * @param now     Current timestamp (ms)
 * @param gaze    Latest gaze position in pixels, or null if unavailable
 * @param dotX    Dot X position in pixels
 * @param dotY    Dot Y position in pixels
 * @param viewW   Viewport width in pixels
 * @param viewH   Viewport height in pixels
 */
export function updateAdaptiveSpeed(
  state: AdaptiveSpeedState,
  now: number,
  gaze: GazePoint | null,
  dotX: number,
  dotY: number,
  viewW: number,
  viewH: number,
): number {
  if (now - state.lastCheckTime < CHECK_INTERVAL_MS) {
    return state.multiplier
  }
  state.lastCheckTime = now

  if (!gaze || viewW === 0 || viewH === 0) {
    return state.multiplier
  }

  const diagonal = Math.sqrt(viewW * viewW + viewH * viewH)
  const dx = gaze.x - dotX
  const dy = gaze.y - dotY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const normalizedDistance = distance / diagonal

  if (normalizedDistance > LAG_THRESHOLD) {
    state.consecutiveLag++
    if (state.consecutiveLag >= CONSECUTIVE_LAG_NEEDED) {
      state.multiplier = Math.max(MIN_MULTIPLIER, state.multiplier - SLOW_DOWN_STEP)
    }
  } else {
    state.consecutiveLag = 0
    if (state.multiplier < MAX_MULTIPLIER) {
      state.multiplier = Math.min(MAX_MULTIPLIER, state.multiplier + SPEED_UP_STEP)
    }
  }

  return state.multiplier
}
