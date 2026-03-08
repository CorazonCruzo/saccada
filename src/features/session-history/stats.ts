import type { SessionRecord } from '@/shared/lib/db'

export interface SessionStats {
  totalSessions: number
  totalTimeMs: number
  mostUsedPatternId: string | null
  mostUsedPatternName: string | null
  streak: number
  avgMoodChange: number | null
  completionRate: number
  avgDurationMs: number
  preferredTimeOfDay: string | null
  bestPatternId: string | null
}

export function computeStats(sessions: SessionRecord[]): SessionStats {
  const empty: SessionStats = {
    totalSessions: 0, totalTimeMs: 0, mostUsedPatternId: null, mostUsedPatternName: null,
    streak: 0, avgMoodChange: null, completionRate: 0, avgDurationMs: 0,
    preferredTimeOfDay: null, bestPatternId: null,
  }
  if (sessions.length === 0) return empty

  const totalTimeMs = sessions.reduce((sum, s) => sum + s.elapsed, 0)

  // Most used pattern
  const counts = new Map<string, { count: number; name: string }>()
  for (const s of sessions) {
    const entry = counts.get(s.patternId)
    if (entry) {
      entry.count++
    } else {
      counts.set(s.patternId, { count: 1, name: s.patternName })
    }
  }
  let mostUsedPatternId: string | null = null
  let mostUsedPatternName: string | null = null
  let maxCount = 0
  for (const [id, { count, name }] of counts) {
    if (count > maxCount) {
      maxCount = count
      mostUsedPatternId = id
      mostUsedPatternName = name
    }
  }

  // Avg mood change (moodBefore - moodAfter; positive = improvement on 1-5 scale)
  const avgMoodChange = computeAvgMoodChange(sessions)

  // Completion rate
  const completedCount = sessions.filter((s) => s.completed).length
  const completionRate = Math.round((completedCount / sessions.length) * 100)

  // Avg duration
  const avgDurationMs = Math.round(totalTimeMs / sessions.length)

  // Preferred time of day
  const preferredTimeOfDay = computePreferredTime(sessions)

  // Best pattern (by avg mood improvement)
  const bestPatternId = computeBestPattern(sessions)

  // Streak: consecutive days with at least one session, counting back from today
  const streak = computeStreak(sessions)

  return {
    totalSessions: sessions.length, totalTimeMs, mostUsedPatternId, mostUsedPatternName,
    streak, avgMoodChange, completionRate, avgDurationMs, preferredTimeOfDay, bestPatternId,
  }
}

/** Average of (moodBefore - moodAfter). Positive = improvement. null if no mood data. */
export function computeAvgMoodChange(sessions: SessionRecord[]): number | null {
  const withBoth = sessions.filter((s) => s.moodBefore != null && s.moodAfter != null)
  if (withBoth.length === 0) return null
  const total = withBoth.reduce((sum, s) => sum + (s.moodBefore! - s.moodAfter!), 0)
  return +(total / withBoth.length).toFixed(1)
}

/** Most common time-of-day bucket: morning (5-12), afternoon (12-17), evening (17-22), night (22-5) */
export function computePreferredTime(sessions: SessionRecord[]): string | null {
  if (sessions.length === 0) return null
  const buckets: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const s of sessions) {
    const h = new Date(s.timestamp).getHours()
    if (h >= 5 && h < 12) buckets.morning++
    else if (h >= 12 && h < 17) buckets.afternoon++
    else if (h >= 17 && h < 22) buckets.evening++
    else buckets.night++
  }
  let best: string | null = null
  let bestCount = 0
  for (const [bucket, count] of Object.entries(buckets)) {
    if (count > bestCount) {
      bestCount = count
      best = bucket
    }
  }
  return best
}

/** Pattern with best avg mood improvement (moodBefore - moodAfter). Needs >= 1 session with both moods. */
export function computeBestPattern(sessions: SessionRecord[]): string | null {
  const byPattern = new Map<string, { sum: number; count: number }>()
  for (const s of sessions) {
    if (s.moodBefore == null || s.moodAfter == null) continue
    const entry = byPattern.get(s.patternId)
    const diff = s.moodBefore - s.moodAfter
    if (entry) {
      entry.sum += diff
      entry.count++
    } else {
      byPattern.set(s.patternId, { sum: diff, count: 1 })
    }
  }
  if (byPattern.size === 0) return null
  let bestId: string | null = null
  let bestAvg = -Infinity
  for (const [id, { sum, count }] of byPattern) {
    const avg = sum / count
    if (avg > bestAvg) {
      bestAvg = avg
      bestId = id
    }
  }
  return bestAvg > 0 ? bestId : null
}

export function computeStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0

  const daySet = new Set<string>()
  for (const s of sessions) {
    daySet.add(toDateKey(s.timestamp))
  }

  const today = toDateKey(Date.now())
  const yesterday = toDateKey(Date.now() - 86400000)

  // Start from today or yesterday
  let current: string
  if (daySet.has(today)) {
    current = today
  } else if (daySet.has(yesterday)) {
    current = yesterday
  } else {
    return 0
  }

  let streak = 0
  let dateMs = dateKeyToMs(current)
  while (daySet.has(toDateKey(dateMs))) {
    streak++
    dateMs -= 86400000
  }

  return streak
}

function toDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateKeyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime() // noon to avoid DST issues
}
