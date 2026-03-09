import { describe, it, expect } from 'vitest'
import {
  getISOWeekStart,
  getWeeklyProgress,
  getWeeklyGoalStreak,
  getNewMilestone,
  MILESTONE_WEEKS,
} from './weeklyGoal'
import type { SessionRecord } from '@/shared/lib/db'

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 1,
    patternId: 'pralokita',
    patternName: 'Pralokita',
    elapsed: 180000,
    completed: true,
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('getISOWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-03-11 is a Wednesday
    const wed = new Date(2026, 2, 11, 15, 30)
    const result = getISOWeekStart(wed)
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getDate()).toBe(9) // March 9
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 2, 9, 10, 0)
    const result = getISOWeekStart(mon)
    expect(result.getDate()).toBe(9)
    expect(result.getDay()).toBe(1)
  })

  it('returns previous Monday for a Sunday', () => {
    // 2026-03-15 is a Sunday
    const sun = new Date(2026, 2, 15, 23, 59)
    const result = getISOWeekStart(sun)
    expect(result.getDate()).toBe(9) // Mon March 9
  })

  it('handles month boundary (Sunday March 1)', () => {
    // 2026-03-01 is a Sunday -> week starts Feb 23
    const sun = new Date(2026, 2, 1)
    const result = getISOWeekStart(sun)
    expect(result.getMonth()).toBe(1) // February
    expect(result.getDate()).toBe(23)
  })

  it('defaults to current date', () => {
    const result = getISOWeekStart()
    expect(result.getDay()).toBe(1) // Always Monday
    expect(result.getHours()).toBe(0)
  })
})

describe('getWeeklyProgress', () => {
  // Week of Mon March 9 - Sun March 15, 2026
  const weekStart = new Date(2026, 2, 9, 0, 0, 0)

  it('returns 0 for empty sessions', () => {
    expect(getWeeklyProgress([], weekStart)).toBe(0)
  })

  it('returns 0 for sessions outside the week', () => {
    const sessions = [
      makeSession({ timestamp: new Date(2026, 2, 8, 23, 59).getTime() }), // Sun before
      makeSession({ timestamp: new Date(2026, 2, 16, 0, 0).getTime() }),  // Mon after
    ]
    expect(getWeeklyProgress(sessions, weekStart)).toBe(0)
  })

  it('counts unique days, not session count', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }),  // Mon 10am
      makeSession({ id: 2, timestamp: new Date(2026, 2, 9, 14, 0).getTime() }),  // Mon 2pm
      makeSession({ id: 3, timestamp: new Date(2026, 2, 9, 20, 0).getTime() }),  // Mon 8pm
    ]
    expect(getWeeklyProgress(sessions, weekStart)).toBe(1) // 1 unique day
  })

  it('counts multiple unique days', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }),   // Mon
      makeSession({ id: 2, timestamp: new Date(2026, 2, 10, 10, 0).getTime() }),  // Tue
      makeSession({ id: 3, timestamp: new Date(2026, 2, 12, 10, 0).getTime() }),  // Thu
    ]
    expect(getWeeklyProgress(sessions, weekStart)).toBe(3)
  })

  it('counts up to 7 days', () => {
    const sessions = Array.from({ length: 7 }, (_, i) =>
      makeSession({ id: i + 1, timestamp: new Date(2026, 2, 9 + i, 12, 0).getTime() }),
    )
    expect(getWeeklyProgress(sessions, weekStart)).toBe(7)
  })

  it('includes Sunday (last day of ISO week)', () => {
    const sessions = [
      makeSession({ timestamp: new Date(2026, 2, 15, 23, 59).getTime() }), // Sun 23:59
    ]
    expect(getWeeklyProgress(sessions, weekStart)).toBe(1)
  })
})

describe('getWeeklyGoalStreak', () => {
  // For these tests, "now" is Wed March 11 2026
  // Current week: Mon March 9 - Sun March 15
  const now = new Date(2026, 2, 11, 12, 0)

  it('returns 0 for empty sessions', () => {
    expect(getWeeklyGoalStreak([], 3, now)).toBe(0)
  })

  it('returns 0 for goal <= 0', () => {
    const sessions = [makeSession({ timestamp: now.getTime() })]
    expect(getWeeklyGoalStreak(sessions, 0, now)).toBe(0)
  })

  it('returns 1 when current week meets goal', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }),
      makeSession({ id: 2, timestamp: new Date(2026, 2, 10, 10, 0).getTime() }),
      makeSession({ id: 3, timestamp: new Date(2026, 2, 11, 10, 0).getTime() }),
    ]
    expect(getWeeklyGoalStreak(sessions, 3, now)).toBe(1)
  })

  it('returns 0 when current week does not meet goal and previous week also fails', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }), // only 1 day this week
    ]
    expect(getWeeklyGoalStreak(sessions, 3, now)).toBe(0)
  })

  it('counts consecutive weeks backwards', () => {
    // 3 consecutive weeks, each with 3+ days
    const sessions = [
      // Current week (March 9-15): 3 days
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }),
      makeSession({ id: 2, timestamp: new Date(2026, 2, 10, 10, 0).getTime() }),
      makeSession({ id: 3, timestamp: new Date(2026, 2, 11, 10, 0).getTime() }),
      // Previous week (March 2-8): 3 days
      makeSession({ id: 4, timestamp: new Date(2026, 2, 2, 10, 0).getTime() }),
      makeSession({ id: 5, timestamp: new Date(2026, 2, 4, 10, 0).getTime() }),
      makeSession({ id: 6, timestamp: new Date(2026, 2, 6, 10, 0).getTime() }),
      // Two weeks ago (Feb 23 - Mar 1): 3 days
      makeSession({ id: 7, timestamp: new Date(2026, 1, 23, 10, 0).getTime() }),
      makeSession({ id: 8, timestamp: new Date(2026, 1, 25, 10, 0).getTime() }),
      makeSession({ id: 9, timestamp: new Date(2026, 1, 27, 10, 0).getTime() }),
    ]
    expect(getWeeklyGoalStreak(sessions, 3, now)).toBe(3)
  })

  it('breaks streak on a gap week', () => {
    const sessions = [
      // Current week: 3 days
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }),
      makeSession({ id: 2, timestamp: new Date(2026, 2, 10, 10, 0).getTime() }),
      makeSession({ id: 3, timestamp: new Date(2026, 2, 11, 10, 0).getTime() }),
      // Previous week: only 1 day (gap!)
      makeSession({ id: 4, timestamp: new Date(2026, 2, 5, 10, 0).getTime() }),
      // Two weeks ago: 3 days (doesn't matter, streak broken)
      makeSession({ id: 5, timestamp: new Date(2026, 1, 23, 10, 0).getTime() }),
      makeSession({ id: 6, timestamp: new Date(2026, 1, 25, 10, 0).getTime() }),
      makeSession({ id: 7, timestamp: new Date(2026, 1, 27, 10, 0).getTime() }),
    ]
    expect(getWeeklyGoalStreak(sessions, 3, now)).toBe(1) // only current week
  })

  it('starts from previous week if current week not yet met', () => {
    const sessions = [
      // Current week: only 1 day (not met)
      makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 10, 0).getTime() }),
      // Previous week: 3 days
      makeSession({ id: 2, timestamp: new Date(2026, 2, 2, 10, 0).getTime() }),
      makeSession({ id: 3, timestamp: new Date(2026, 2, 4, 10, 0).getTime() }),
      makeSession({ id: 4, timestamp: new Date(2026, 2, 6, 10, 0).getTime() }),
      // Two weeks ago: 3 days
      makeSession({ id: 5, timestamp: new Date(2026, 1, 23, 10, 0).getTime() }),
      makeSession({ id: 6, timestamp: new Date(2026, 1, 25, 10, 0).getTime() }),
      makeSession({ id: 7, timestamp: new Date(2026, 1, 27, 10, 0).getTime() }),
    ]
    expect(getWeeklyGoalStreak(sessions, 3, now)).toBe(2)
  })
})

describe('getNewMilestone', () => {
  it('returns first matching unseen milestone', () => {
    expect(getNewMilestone(4, [])).toBe(2) // 2 is first unseen
  })

  it('skips already seen milestones', () => {
    expect(getNewMilestone(4, [2])).toBe(4)
  })

  it('returns null when no new milestones', () => {
    expect(getNewMilestone(4, [2, 4])).toBeNull()
  })

  it('returns null when streak is below all milestones', () => {
    expect(getNewMilestone(1, [])).toBeNull()
  })

  it('returns highest unseen milestone when streak is large', () => {
    expect(getNewMilestone(52, [2, 4, 8, 12, 24])).toBe(52)
  })

  it('returns lowest unseen milestone when multiple are new', () => {
    expect(getNewMilestone(12, [])).toBe(2)
  })

  it('MILESTONE_WEEKS contains expected values', () => {
    expect(MILESTONE_WEEKS).toEqual([2, 4, 8, 12, 24, 52])
  })
})
