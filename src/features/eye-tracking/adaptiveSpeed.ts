import type { GazePoint } from './EyeTracker'

/**
 * Adaptive speed controller.
 * Uses EMA-smoothed gaze-to-dot distance mapped directly to a speed multiplier.
 * No step accumulation — multiplier tracks the smoothed distance continuously.
 */

const CHECK_INTERVAL_MS = 100
const DISTANCE_EMA_ALPHA = 0.4    // higher = more responsive to changes
const NEAR_THRESHOLD = 0.08       // below this: full speed (1.0)
const FAR_THRESHOLD = 0.20        // above this: minimum speed
const MIN_MULTIPLIER = 0.4
const MAX_MULTIPLIER = 1.0

export interface AdaptiveSpeedState {
  multiplier: number
  smoothedDistance: number
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
 * Multiplier is directly proportional to smoothed distance:
 *   distance <= NEAR_THRESHOLD  →  1.0 (full speed)
 *   distance >= FAR_THRESHOLD   →  MIN_MULTIPLIER
 *   in between                  →  linear interpolation
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

  // Direct proportional mapping (no steps, no dead zone)
  const t = Math.max(0, Math.min(1,
    (state.smoothedDistance - NEAR_THRESHOLD) / (FAR_THRESHOLD - NEAR_THRESHOLD),
  ))
  state.multiplier = MAX_MULTIPLIER - t * (MAX_MULTIPLIER - MIN_MULTIPLIER)

  return state.multiplier
}
