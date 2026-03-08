import type { SessionRecord } from '@/shared/lib/db'

export interface CalendarDay {
  /** Day of month (1-31), or 0 for padding cells */
  day: number
  /** YYYY-MM-DD key, empty string for padding */
  date: string
  count: number
  totalTimeMs: number
  isToday: boolean
  isFuture: boolean
  inStreak: boolean
  /** True if this is an empty padding cell (before month start / after month end) */
  isPadding: boolean
}

export interface MonthGrid {
  year: number
  month: number // 0-based
  label: string // localized month + year, e.g. "March 2026"
  weeks: CalendarDay[][] // 4-6 rows of 7 days (Mon-Sun)
}

const DAY_MS = 86400000

export function toDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateKeyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

/** Monday-based day of week: 0=Mon..6=Sun */
function mondayDow(date: Date): number {
  return (date.getDay() + 6) % 7
}

function makePaddingDay(): CalendarDay {
  return { day: 0, date: '', count: 0, totalTimeMs: 0, isToday: false, isFuture: false, inStreak: false, isPadding: true }
}

/**
 * Build a monthly calendar grid for the given year/month.
 * Returns a MonthGrid with 4-6 weeks, each containing 7 CalendarDay objects (Mon-Sun).
 */
export function buildMonthGrid(
  sessions: SessionRecord[],
  year: number,
  month: number, // 0-based
  locale: string,
  now?: number,
): MonthGrid {
  const today = new Date(now ?? Date.now())
  today.setHours(0, 0, 0, 0)
  const todayKey = toDateKey(today.getTime())
  const todayMs = today.getTime()

  // Aggregate sessions per day
  const dayCounts = new Map<string, number>()
  const dayTimes = new Map<string, number>()
  for (const s of sessions) {
    const key = toDateKey(s.timestamp)
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    dayTimes.set(key, (dayTimes.get(key) ?? 0) + s.elapsed)
  }

  // Current streak
  const streakDays = computeStreakDays(dayCounts, todayKey)

  // Month info
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = mondayDow(firstOfMonth) // 0=Mon..6=Sun

  // Month label
  const label = firstOfMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  // Build weeks
  const weeks: CalendarDay[][] = []
  let currentWeek: CalendarDay[] = []

  // Leading padding (days before the 1st)
  for (let i = 0; i < startDow; i++) {
    currentWeek.push(makePaddingDay())
  }

  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateMs = new Date(year, month, d, 0, 0, 0, 0).getTime()
    const key = toDateKey(dateMs)
    const isFuture = dateMs > todayMs

    currentWeek.push({
      day: d,
      date: key,
      count: isFuture ? 0 : (dayCounts.get(key) ?? 0),
      totalTimeMs: isFuture ? 0 : (dayTimes.get(key) ?? 0),
      isToday: key === todayKey,
      isFuture,
      inStreak: isFuture ? false : streakDays.has(key),
      isPadding: false,
    })

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Trailing padding
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(makePaddingDay())
    }
    weeks.push(currentWeek)
  }

  return { year, month, label, weeks }
}

/**
 * Navigate to previous month. Returns [year, month].
 */
export function prevMonth(year: number, month: number): [number, number] {
  return month === 0 ? [year - 1, 11] : [year, month - 1]
}

/**
 * Navigate to next month. Returns [year, month].
 */
export function nextMonth(year: number, month: number): [number, number] {
  return month === 11 ? [year + 1, 0] : [year, month + 1]
}

/**
 * Check if a month is in the future (after current month).
 */
export function isMonthInFuture(year: number, month: number, now?: number): boolean {
  const today = new Date(now ?? Date.now())
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  return year > currentYear || (year === currentYear && month > currentMonth)
}

/** Returns the set of date keys forming the current streak. */
function computeStreakDays(counts: Map<string, number>, todayKey: string): Set<string> {
  const result = new Set<string>()
  const todayMs = dateKeyToMs(todayKey)
  const yesterdayKey = toDateKey(todayMs - DAY_MS)

  let current: string
  if (counts.has(todayKey)) {
    current = todayKey
  } else if (counts.has(yesterdayKey)) {
    current = yesterdayKey
  } else {
    return result
  }

  let dateMs = dateKeyToMs(current)
  while (counts.has(toDateKey(dateMs))) {
    result.add(toDateKey(dateMs))
    dateMs -= DAY_MS
  }

  return result
}

/** Longest streak ever across all sessions. */
export function computeLongestStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0

  const daySet = new Set<string>()
  for (const s of sessions) {
    daySet.add(toDateKey(s.timestamp))
  }

  const sorted = Array.from(daySet).sort()
  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i++) {
    const prevMs = dateKeyToMs(sorted[i - 1])
    const currMs = dateKeyToMs(sorted[i])
    if (currMs - prevMs <= DAY_MS + 1000) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }

  return longest
}

/** Color level 0-4 based on session count. */
export function colorLevel(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}
