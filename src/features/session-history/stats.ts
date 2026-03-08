import type { SessionRecord } from '@/shared/lib/db'

export interface SessionStats {
  totalSessions: number
  totalTimeMs: number
  mostUsedPatternId: string | null
  mostUsedPatternName: string | null
  streak: number
}

export function computeStats(sessions: SessionRecord[]): SessionStats {
  if (sessions.length === 0) {
    return { totalSessions: 0, totalTimeMs: 0, mostUsedPatternId: null, mostUsedPatternName: null, streak: 0 }
  }

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

  // Streak: consecutive days with at least one session, counting back from today
  const streak = computeStreak(sessions)

  return { totalSessions: sessions.length, totalTimeMs, mostUsedPatternId, mostUsedPatternName, streak }
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
