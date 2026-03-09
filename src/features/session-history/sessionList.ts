import type { SessionRecord } from '@/shared/lib/db'
import type { PatternConfig } from '@/entities/pattern'
import type { Translation } from '@/shared/lib/i18n/types'
import { toDateKey } from './activityCalendar'
import { computeFocusScore, computeFocusScoreDirect, reconstructDotPositions } from '@/shared/lib/math'

export interface SessionGroup {
  dateKey: string
  label: string
  sessions: SessionRecord[]
}

/**
 * Group sessions by day and assign labels ("Today", "Yesterday", or formatted date).
 * Sessions must already be sorted (newest first). Groups preserve input order.
 */
export function groupSessionsByDay(
  sessions: SessionRecord[],
  locale: string,
  t: Pick<Translation, 'history'>,
  now?: number,
): SessionGroup[] {
  const nowMs = now ?? Date.now()
  const todayKey = toDateKey(nowMs)
  const yesterdayKey = toDateKey(nowMs - 86400000)

  const groups = new Map<string, SessionRecord[]>()
  for (const s of sessions) {
    const key = toDateKey(s.timestamp)
    const arr = groups.get(key)
    if (arr) arr.push(s)
    else groups.set(key, [s])
  }

  return Array.from(groups.entries()).map(([key, sess]) => ({
    dateKey: key,
    label:
      key === todayKey
        ? t.history.calendarToday
        : key === yesterdayKey
          ? t.history.yesterday
          : new Date(key + 'T00:00:00').toLocaleDateString(locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
    sessions: sess,
  }))
}

/**
 * Average Focus Score across sessions that have gaze data.
 * Returns null if no sessions have computable focus scores.
 */
export function computeAvgFocusScore(
  sessions: SessionRecord[],
  patternsById: Record<string, PatternConfig>,
): number | null {
  let sum = 0
  let count = 0
  for (const s of sessions) {
    const score = getSessionFocusScore(s, patternsById[s.patternId])
    if (score != null) {
      sum += score
      count++
    }
  }
  return count > 0 ? Math.round(sum / count) : null
}

/**
 * Compute Focus Score for a session.
 * Returns null if session has no gaze data or fewer than 5 points.
 *
 * Prefers recorded dot positions (dotX/dotY on each gaze point) for accuracy.
 * Falls back to reconstruction from pattern config for older sessions.
 */
export function getSessionFocusScore(
  session: SessionRecord,
  pattern: PatternConfig | undefined,
): number | null {
  if (!session.gazePoints || session.gazePoints.length < 5) return null

  const vw = session.viewportWidth ?? 1000
  const vh = session.viewportHeight ?? 800
  const diagonal = Math.sqrt(vw ** 2 + vh ** 2)

  // New path: use recorded dot positions (accurate, no reconstruction needed)
  const hasRecordedDot = session.gazePoints[0].dotX != null
  if (hasRecordedDot) {
    return computeFocusScoreDirect(session.gazePoints, diagonal)
  }

  // Legacy fallback: reconstruct dot positions from pattern config
  if (!pattern) return null
  const timestamps = session.gazePoints.map((p) => p.t)
  const speed = session.speed ?? 1
  const vs = session.visualScale ?? 1
  const dotPositions = reconstructDotPositions(timestamps, pattern, vw, vh, speed, vs)

  return computeFocusScore(session.gazePoints, dotPositions, diagonal)
}
