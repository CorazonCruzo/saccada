import type { PatternConfig } from '@/entities/pattern'
import { getTrajectoryPosition, toCanvasCoords } from './trajectories'

/**
 * Focus threshold as fraction of viewport diagonal.
 * Typical webcam eye-tracking accuracy is 100-200px; on a 1920x1080 display
 * the diagonal is ~2203px, so 25% = ~550px — generous enough to
 * tolerate webcam eye-tracking noise while still penalizing clear
 * off-target gaze.
 */
const FOCUS_THRESHOLD = 0.25

export interface GazePoint {
  x: number
  y: number
  t: number
  dotX?: number
  dotY?: number
}

export interface DotPosition {
  x: number
  y: number
  t: number
}

/**
 * Reconstruct dot positions at the same timestamps as gaze points.
 * Uses the pattern config to compute where the dot was at each moment.
 *
 * @param speed - Session speed multiplier (default 1). Gaze timestamps are real time,
 *   but the animation advances at `realTime * speed`, so we must apply the same factor.
 * @param visualScale - Visual scale multiplier (default 1). The animation multiplies
 *   normalized trajectory positions by this factor before converting to canvas coords.
 */
export function reconstructDotPositions(
  timestamps: number[],
  pattern: PatternConfig,
  viewportW: number,
  viewportH: number,
  speed: number = 1,
  visualScale: number = 1,
): DotPosition[] {
  const totalPhaseDur = pattern.phases.reduce((s, p) => s + p.duration, 0)
  if (totalPhaseDur === 0) return timestamps.map((t) => ({ x: viewportW / 2, y: viewportH / 2, t }))

  // Normalize timestamps: gaze t is relative to pipeline start (calibration start),
  // but animation animTime starts at 0 when the session begins. The first recorded
  // gaze point approximately coincides with animation start.
  const t0 = timestamps.length > 0 ? timestamps[0] : 0

  return timestamps.map((t) => {
    // Animation time = elapsed since session start * speed
    const animTime = (t - t0) * speed
    const looped = animTime % totalPhaseDur
    let accum = 0
    let phaseElapsed = looped

    for (const phase of pattern.phases) {
      if (looped < accum + phase.duration) {
        phaseElapsed = looped - accum
        if (phase.type === 'movement' && pattern.cycleDuration) {
          const cycleT = (phaseElapsed % pattern.cycleDuration) / pattern.cycleDuration
          const norm = getTrajectoryPosition(cycleT, pattern.trajectory, pattern.trajectoryParams)
          // Apply visual scale (matching useAnimationLoop: normPos.x *= vs)
          norm.x *= visualScale
          norm.y *= visualScale
          const pos = toCanvasCoords(norm, viewportW, viewportH)
          return { x: pos.x, y: pos.y, t }
        }
        return { x: viewportW / 2, y: viewportH / 2, t }
      }
      accum += phase.duration
    }

    return { x: viewportW / 2, y: viewportH / 2, t }
  })
}

/**
 * Compute Focus Score directly from gaze points that have recorded dot positions.
 * Most accurate method — uses the real dot position captured during the session.
 */
export function computeFocusScoreDirect(
  gazePoints: GazePoint[],
  viewportDiagonal: number,
): number {
  if (gazePoints.length === 0) return 0

  const threshold = viewportDiagonal * FOCUS_THRESHOLD
  let onTarget = 0

  for (const gaze of gazePoints) {
    if (gaze.dotX == null || gaze.dotY == null) continue
    const dist = Math.sqrt((gaze.x - gaze.dotX) ** 2 + (gaze.y - gaze.dotY) ** 2)
    if (dist < threshold) onTarget++
  }

  return Math.round((onTarget / gazePoints.length) * 100)
}

/**
 * Compute Focus Score (0-100) by comparing gaze positions to reconstructed dot positions.
 * Legacy method for sessions without recorded dot positions.
 * "On target" = distance < 15% of viewport diagonal.
 */
export function computeFocusScore(
  gazePoints: GazePoint[],
  dotPositions: DotPosition[],
  viewportDiagonal: number,
): number {
  if (gazePoints.length === 0 || dotPositions.length === 0) return 0

  const threshold = viewportDiagonal * FOCUS_THRESHOLD
  let onTarget = 0

  for (const gaze of gazePoints) {
    const dot = findClosestByTime(gaze.t, dotPositions)
    const dist = Math.sqrt((gaze.x - dot.x) ** 2 + (gaze.y - dot.y) ** 2)
    if (dist < threshold) onTarget++
  }

  return Math.round((onTarget / gazePoints.length) * 100)
}

/**
 * Compute per-segment focus data for timeline visualization.
 * Divides session into N equal segments and returns focus ratio per segment.
 */
export function computeFocusTimeline(
  gazePoints: GazePoint[],
  dotPositions: DotPosition[],
  viewportDiagonal: number,
  segments: number = 50,
): number[] {
  if (gazePoints.length === 0 || dotPositions.length === 0) {
    return new Array(segments).fill(0)
  }

  const threshold = viewportDiagonal * FOCUS_THRESHOLD
  const minT = gazePoints[0].t
  const maxT = gazePoints[gazePoints.length - 1].t
  const duration = maxT - minT
  if (duration <= 0) return new Array(segments).fill(0)

  const segDuration = duration / segments
  const result: number[] = new Array(segments).fill(0)
  const counts: number[] = new Array(segments).fill(0)

  for (const gaze of gazePoints) {
    const segIdx = Math.min(Math.floor((gaze.t - minT) / segDuration), segments - 1)
    const dot = findClosestByTime(gaze.t, dotPositions)
    const dist = Math.sqrt((gaze.x - dot.x) ** 2 + (gaze.y - dot.y) ** 2)
    counts[segIdx]++
    if (dist < threshold) result[segIdx]++
  }

  return result.map((onTarget, i) => (counts[i] > 0 ? onTarget / counts[i] : 0))
}

/** Find the dot position closest in time to the given timestamp. */
function findClosestByTime(t: number, positions: DotPosition[]): DotPosition {
  let lo = 0
  let hi = positions.length - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (positions[mid].t < t) lo = mid + 1
    else hi = mid
  }

  if (lo === 0) return positions[0]
  const prev = positions[lo - 1]
  const curr = positions[lo]
  return Math.abs(prev.t - t) <= Math.abs(curr.t - t) ? prev : curr
}
