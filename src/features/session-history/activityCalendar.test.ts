import { describe, it, expect } from 'vitest'
import {
  buildMonthGrid, prevMonth, nextMonth, isMonthInFuture,
  computeLongestStreak, colorLevel, toDateKey, dateKeyToMs,
} from './activityCalendar'
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

const DAY = 86400000

describe('buildMonthGrid', () => {
  // Fixed "now": Wednesday 2026-03-11 12:00
  const now = new Date(2026, 2, 11, 12, 0, 0).getTime()

  it('returns correct year, month, and label', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    expect(grid.year).toBe(2026)
    expect(grid.month).toBe(2)
    expect(grid.label.toLowerCase()).toContain('march')
  })

  it('has 4-6 weeks', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    expect(grid.weeks.length).toBeGreaterThanOrEqual(4)
    expect(grid.weeks.length).toBeLessThanOrEqual(6)
  })

  it('each week has exactly 7 days', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    for (const week of grid.weeks) {
      expect(week).toHaveLength(7)
    }
  })

  it('first real day is day 1', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays[0].day).toBe(1)
  })

  it('last real day matches days in month', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays[allDays.length - 1].day).toBe(31) // March has 31 days
  })

  it('padding cells have isPadding=true and day=0', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const paddings = grid.weeks.flat().filter((d) => d.isPadding)
    for (const p of paddings) {
      expect(p.day).toBe(0)
      expect(p.date).toBe('')
    }
  })

  it('first day of month lands on correct weekday', () => {
    // March 1, 2026 is a Sunday → should be at index 6 in first week (Mon=0..Sun=6)
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const firstWeek = grid.weeks[0]
    // First 6 should be padding (Mon-Sat), Sunday should be day 1
    for (let i = 0; i < 6; i++) {
      expect(firstWeek[i].isPadding).toBe(true)
    }
    expect(firstWeek[6].day).toBe(1)
    expect(firstWeek[6].isPadding).toBe(false)
  })

  it('marks today correctly', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const todayCells = allDays.filter((d) => d.isToday)
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0].day).toBe(11)
    expect(todayCells[0].date).toBe('2026-03-11')
  })

  it('marks future days', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const day12 = allDays.find((d) => d.day === 12)!
    expect(day12.isFuture).toBe(true)
    const day10 = allDays.find((d) => d.day === 10)!
    expect(day10.isFuture).toBe(false)
  })

  it('counts sessions per day', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 3600000 }),
      makeSession({ id: 3, timestamp: now - DAY }),
    ]
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const day11 = allDays.find((d) => d.day === 11)!
    const day10 = allDays.find((d) => d.day === 10)!
    expect(day11.count).toBe(2)
    expect(day10.count).toBe(1)
  })

  it('aggregates totalTimeMs per day', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now, elapsed: 60000 }),
      makeSession({ id: 2, timestamp: now - 3600000, elapsed: 120000 }),
    ]
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const day11 = allDays.find((d) => d.day === 11)!
    expect(day11.totalTimeMs).toBe(180000)
  })

  it('marks streak days', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - DAY }),
      makeSession({ id: 3, timestamp: now - 2 * DAY }),
    ]
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays.find((d) => d.day === 11)!.inStreak).toBe(true)
    expect(allDays.find((d) => d.day === 10)!.inStreak).toBe(true)
    expect(allDays.find((d) => d.day === 9)!.inStreak).toBe(true)
    expect(allDays.find((d) => d.day === 8)!.inStreak).toBe(false)
  })

  it('future days have count=0 and inStreak=false', () => {
    const grid = buildMonthGrid([], 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const futureDays = allDays.filter((d) => d.isFuture)
    for (const d of futureDays) {
      expect(d.count).toBe(0)
      expect(d.inStreak).toBe(false)
    }
  })

  it('non-current month has no isToday', () => {
    const grid = buildMonthGrid([], 2026, 1, 'en', now) // February
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays.every((d) => !d.isToday)).toBe(true)
  })

  it('February 2026 has 28 days', () => {
    const grid = buildMonthGrid([], 2026, 1, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays).toHaveLength(28)
  })

  it('past month has no future days', () => {
    const grid = buildMonthGrid([], 2026, 1, 'en', now) // February (past)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays.every((d) => !d.isFuture)).toBe(true)
  })
})

describe('real-world scenario: sessions on Mar 8-9 2026', () => {
  const now = new Date(2026, 2, 9, 12, 0, 0).getTime()

  const sessions = [
    makeSession({ id: 1, timestamp: new Date(2026, 2, 9, 0, 1).getTime(), elapsed: 30000 }),
    makeSession({ id: 2, timestamp: new Date(2026, 2, 8, 23, 44).getTime(), elapsed: 30000 }),
    makeSession({ id: 3, timestamp: new Date(2026, 2, 8, 23, 35).getTime(), elapsed: 34000 }),
    makeSession({ id: 4, timestamp: new Date(2026, 2, 8, 23, 21).getTime(), elapsed: 16000 }),
  ]

  it('today (Mar 9) has count 1', () => {
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const day9 = allDays.find((d) => d.day === 9)!
    expect(day9.count).toBe(1)
    expect(day9.isToday).toBe(true)
  })

  it('Mar 8 has count 3', () => {
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    const day8 = allDays.find((d) => d.day === 8)!
    expect(day8.count).toBe(3)
  })

  it('totalTimeMs correct', () => {
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays.find((d) => d.day === 9)!.totalTimeMs).toBe(30000)
    expect(allDays.find((d) => d.day === 8)!.totalTimeMs).toBe(80000)
  })

  it('streak covers both days', () => {
    const grid = buildMonthGrid(sessions, 2026, 2, 'en', now)
    const allDays = grid.weeks.flat().filter((d) => !d.isPadding)
    expect(allDays.find((d) => d.day === 9)!.inStreak).toBe(true)
    expect(allDays.find((d) => d.day === 8)!.inStreak).toBe(true)
    expect(allDays.find((d) => d.day === 7)!.inStreak).toBe(false)
  })
})

describe('prevMonth / nextMonth', () => {
  it('goes to previous month', () => {
    expect(prevMonth(2026, 2)).toEqual([2026, 1])
  })

  it('wraps year backward', () => {
    expect(prevMonth(2026, 0)).toEqual([2025, 11])
  })

  it('goes to next month', () => {
    expect(nextMonth(2026, 2)).toEqual([2026, 3])
  })

  it('wraps year forward', () => {
    expect(nextMonth(2026, 11)).toEqual([2027, 0])
  })
})

describe('isMonthInFuture', () => {
  const now = new Date(2026, 2, 9, 12, 0, 0).getTime()

  it('current month is not future', () => {
    expect(isMonthInFuture(2026, 2, now)).toBe(false)
  })

  it('next month is future', () => {
    expect(isMonthInFuture(2026, 3, now)).toBe(true)
  })

  it('past month is not future', () => {
    expect(isMonthInFuture(2026, 1, now)).toBe(false)
  })

  it('next year is future', () => {
    expect(isMonthInFuture(2027, 0, now)).toBe(true)
  })
})

describe('computeLongestStreak', () => {
  it('returns 0 for empty array', () => {
    expect(computeLongestStreak([])).toBe(0)
  })

  it('returns 1 for single session', () => {
    expect(computeLongestStreak([makeSession()])).toBe(1)
  })

  it('counts consecutive days', () => {
    const now = new Date(2026, 2, 11, 12, 0, 0).getTime()
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - DAY }),
      makeSession({ id: 3, timestamp: now - 2 * DAY }),
    ]
    expect(computeLongestStreak(sessions)).toBe(3)
  })

  it('finds longest even if not current', () => {
    const now = new Date(2026, 2, 11, 12, 0, 0).getTime()
    const sessions = [
      makeSession({ id: 1, timestamp: now - 30 * DAY }),
      makeSession({ id: 2, timestamp: now - 31 * DAY }),
      makeSession({ id: 3, timestamp: now - 32 * DAY }),
      makeSession({ id: 4, timestamp: now - 33 * DAY }),
      makeSession({ id: 5, timestamp: now - 34 * DAY }),
      makeSession({ id: 6, timestamp: now }),
      makeSession({ id: 7, timestamp: now - DAY }),
    ]
    expect(computeLongestStreak(sessions)).toBe(5)
  })

  it('multiple sessions on same day count as one', () => {
    const now = new Date(2026, 2, 11, 12, 0, 0).getTime()
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 3600000 }),
    ]
    expect(computeLongestStreak(sessions)).toBe(1)
  })
})

describe('colorLevel', () => {
  it('returns 0 for 0 sessions', () => expect(colorLevel(0)).toBe(0))
  it('returns 1 for 1 session', () => expect(colorLevel(1)).toBe(1))
  it('returns 2 for 2 sessions', () => expect(colorLevel(2)).toBe(2))
  it('returns 3 for 3 sessions', () => expect(colorLevel(3)).toBe(3))
  it('returns 4 for 4+ sessions', () => {
    expect(colorLevel(4)).toBe(4)
    expect(colorLevel(10)).toBe(4)
  })
})

describe('toDateKey', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5, 14, 30).getTime())).toBe('2026-01-05')
  })

  it('pads single-digit month and day', () => {
    expect(toDateKey(new Date(2026, 2, 9, 10, 0).getTime())).toBe('2026-03-09')
  })
})

describe('dateKeyToMs', () => {
  it('round-trips with toDateKey', () => {
    const key = '2026-03-11'
    expect(toDateKey(dateKeyToMs(key))).toBe(key)
  })
})
