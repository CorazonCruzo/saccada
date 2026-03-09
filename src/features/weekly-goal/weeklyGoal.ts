import type { SessionRecord } from '@/shared/lib/db'

/** Milestone week counts for one-time messages */
export const MILESTONE_WEEKS = [2, 4, 8, 12, 24, 52] as const

/**
 * Get the Monday 00:00:00 local time of the ISO week containing the given date.
 * ISO 8601: Monday is the first day of the week.
 */
export function getISOWeekStart(date?: Date): Date {
  const d = date ? new Date(date) : new Date()
  d.setHours(0, 0, 0, 0)
  // getDay(): 0=Sun, 1=Mon ... 6=Sat. Convert to Mon=0 offset.
  const dayOfWeek = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayOfWeek)
  return d
}

/** Get a date key YYYY-MM-DD from timestamp (local time) */
function toDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Count unique days with at least one session in the given ISO week.
 * @param weekStart - Monday 00:00:00 of the target week
 */
export function getWeeklyProgress(
  sessions: SessionRecord[],
  weekStart?: Date,
): number {
  const start = weekStart ?? getISOWeekStart()
  const startMs = start.getTime()
  const endMs = startMs + 7 * 86400000

  const uniqueDays = new Set<string>()
  for (const s of sessions) {
    if (s.timestamp >= startMs && s.timestamp < endMs) {
      uniqueDays.add(toDateKey(s.timestamp))
    }
  }
  return uniqueDays.size
}

/**
 * Count consecutive weeks (backwards from the last completed week)
 * where unique session days >= goal.
 *
 * Current week is included only if the goal is already met.
 * If not, counting starts from the previous completed week.
 */
export function getWeeklyGoalStreak(
  sessions: SessionRecord[],
  goal: number,
  now?: Date,
): number {
  if (goal <= 0 || sessions.length === 0) return 0

  const currentWeekStart = getISOWeekStart(now)
  const currentProgress = getWeeklyProgress(sessions, currentWeekStart)

  // Start from current week if goal met, otherwise from previous week
  let checkWeek: Date
  if (currentProgress >= goal) {
    checkWeek = new Date(currentWeekStart)
  } else {
    checkWeek = new Date(currentWeekStart.getTime() - 7 * 86400000)
  }

  let streak = 0
  // Go backwards, max 104 weeks (2 years)
  for (let i = 0; i < 104; i++) {
    const progress = getWeeklyProgress(sessions, checkWeek)
    if (progress >= goal) {
      streak++
      checkWeek = new Date(checkWeek.getTime() - 7 * 86400000)
    } else {
      break
    }
  }

  return streak
}

/**
 * Check if the current streak matches an unseen milestone.
 * Returns the milestone number or null.
 */
export function getNewMilestone(
  streakWeeks: number,
  seenMilestones: number[],
): number | null {
  for (const m of MILESTONE_WEEKS) {
    if (streakWeeks >= m && !seenMilestones.includes(m)) {
      return m
    }
  }
  return null
}
