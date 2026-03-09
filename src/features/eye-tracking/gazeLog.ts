import type { GazePoint } from './EyeTracker'

/**
 * Records gaze positions during a session at ~10fps.
 * Stored in memory, retrieved after session for heatmap.
 */

const LOG_INTERVAL_MS = 100 // ~10fps

export class GazeLog {
  private log: GazePoint[] = []
  private lastLogTime = -Infinity

  /** Record a gaze point if enough time has passed since the last one. */
  record(point: GazePoint): void {
    const now = point.t
    if (now - this.lastLogTime < LOG_INTERVAL_MS) return
    this.lastLogTime = now
    this.log.push({
      x: point.x, y: point.y, t: point.t,
      ...(point.dotX != null && { dotX: point.dotX, dotY: point.dotY }),
    })
  }

  /** Get all recorded points. */
  getPoints(): GazePoint[] {
    return this.log
  }

  /** Number of recorded points. */
  get length(): number {
    return this.log.length
  }

  /** Clear all recorded data. */
  clear(): void {
    this.log = []
    this.lastLogTime = -Infinity
  }
}
