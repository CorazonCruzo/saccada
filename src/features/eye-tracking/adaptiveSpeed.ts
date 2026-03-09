import type { GazePoint } from './EyeTracker'

/**
 * Adaptive speed controller.
 * Uses EMA-smoothed distance between gaze and dot to adjust speed.
 * More robust than consecutive-lag counting: a single lucky reading
 * doesn't reset the entire state.
 */

const CHECK_INTERVAL_MS = 200
const DISTANCE_EMA_ALPHA = 0.3    // smoothing factor for distance tracking
const SLOW_THRESHOLD = 0.15       // 15% of diagonal: start slowing down
const FAST_THRESHOLD = 0.10       // 10% of diagonal: start speeding up
const SLOW_DOWN_STEP = 0.06       // reduce multiplier per check when lagging
const SPEED_UP_STEP = 0.04        // restore multiplier per check when close
const MIN_MULTIPLIER = 0.4
const MAX_MULTIPLIER = 1.0

export interface AdaptiveSpeedState {
  multiplier: number
  smoothedDistance: number    // EMA of normalized gaze-to-dot distance
  lastCheckTime: number
}

export function createAdaptiveSpeedState(): AdaptiveSpeedState {
  return {
    multiplier: 1.0,
    smoothedDistance: 0,
    lastCheckTime: 0,
  }
}

/**
 * Call on each gaze update. Throttled internally to CHECK_INTERVAL_MS.
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

  // EMA: smooth out noisy per-frame distances
  state.smoothedDistance =
    DISTANCE_EMA_ALPHA * normalizedDistance +
    (1 - DISTANCE_EMA_ALPHA) * state.smoothedDistance

  if (state.smoothedDistance > SLOW_THRESHOLD) {
    state.multiplier = Math.max(MIN_MULTIPLIER, state.multiplier - SLOW_DOWN_STEP)
  } else if (state.smoothedDistance < FAST_THRESHOLD) {
    state.multiplier = Math.min(MAX_MULTIPLIER, state.multiplier + SPEED_UP_STEP)
  }
  // Between FAST_THRESHOLD and SLOW_THRESHOLD: hold current speed (dead zone)

  return state.multiplier
}
