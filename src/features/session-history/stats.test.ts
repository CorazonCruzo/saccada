import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeStats, computeStreak, computeAvgMoodChange, computePreferredTime, computeBestPattern } from './stats'
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

describe('computeStats', () => {
  it('returns zeros for empty array', () => {
    const stats = computeStats([])
    expect(stats.totalSessions).toBe(0)
    expect(stats.totalTimeMs).toBe(0)
    expect(stats.mostUsedPatternId).toBeNull()
    expect(stats.mostUsedPatternName).toBeNull()
    expect(stats.streak).toBe(0)
  })

  it('counts total sessions', () => {
    const sessions = [makeSession(), makeSession({ id: 2 }), makeSession({ id: 3 })]
    expect(computeStats(sessions).totalSessions).toBe(3)
  })

  it('sums total time', () => {
    const sessions = [
      makeSession({ elapsed: 60000 }),
      makeSession({ id: 2, elapsed: 120000 }),
    ]
    expect(computeStats(sessions).totalTimeMs).toBe(180000)
  })

  it('finds most used pattern', () => {
    const sessions = [
      makeSession({ patternId: 'sama', patternName: 'Sama' }),
      makeSession({ id: 2, patternId: 'pralokita', patternName: 'Pralokita' }),
      makeSession({ id: 3, patternId: 'pralokita', patternName: 'Pralokita' }),
      makeSession({ id: 4, patternId: 'sama', patternName: 'Sama' }),
      makeSession({ id: 5, patternId: 'pralokita', patternName: 'Pralokita' }),
    ]
    const stats = computeStats(sessions)
    expect(stats.mostUsedPatternId).toBe('pralokita')
    expect(stats.mostUsedPatternName).toBe('Pralokita')
  })

  it('single session is the most used', () => {
    const stats = computeStats([makeSession()])
    expect(stats.mostUsedPatternId).toBe('pralokita')
  })
})

describe('computeStreak', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 for empty sessions', () => {
    expect(computeStreak([])).toBe(0)
  })

  it('returns 1 for session today', () => {
    const sessions = [makeSession({ timestamp: Date.now() })]
    expect(computeStreak(sessions)).toBe(1)
  })

  it('returns 1 for session yesterday (no session today)', () => {
    const sessions = [makeSession({ timestamp: Date.now() - 86400000 })]
    expect(computeStreak(sessions)).toBe(1)
  })

  it('returns 0 for session 2 days ago only', () => {
    const sessions = [makeSession({ timestamp: Date.now() - 86400000 * 2 })]
    expect(computeStreak(sessions)).toBe(0)
  })

  it('counts consecutive days', () => {
    const now = Date.now()
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 86400000 }),
      makeSession({ id: 3, timestamp: now - 86400000 * 2 }),
    ]
    expect(computeStreak(sessions)).toBe(3)
  })

  it('streak breaks on gap', () => {
    const now = Date.now()
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 86400000 }),
      // gap: no session 2 days ago
      makeSession({ id: 3, timestamp: now - 86400000 * 3 }),
    ]
    expect(computeStreak(sessions)).toBe(2)
  })

  it('multiple sessions on same day count as one day', () => {
    const now = Date.now()
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 3600000 }), // 1 hour ago, same day
      makeSession({ id: 3, timestamp: now - 86400000 }),
    ]
    expect(computeStreak(sessions)).toBe(2)
  })
})

describe('computeAvgMoodChange', () => {
  it('returns null when no mood data', () => {
    const sessions = [makeSession(), makeSession({ id: 2 })]
    expect(computeAvgMoodChange(sessions)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(computeAvgMoodChange([])).toBeNull()
  })

  it('computes positive change (improvement: before > after)', () => {
    const sessions = [
      makeSession({ moodBefore: 4, moodAfter: 2 }),
      makeSession({ id: 2, moodBefore: 5, moodAfter: 3 }),
    ]
    expect(computeAvgMoodChange(sessions)).toBe(2)
  })

  it('computes negative change (worsened: before < after)', () => {
    const sessions = [
      makeSession({ moodBefore: 2, moodAfter: 4 }),
    ]
    expect(computeAvgMoodChange(sessions)).toBe(-2)
  })

  it('computes zero for no change', () => {
    const sessions = [
      makeSession({ moodBefore: 3, moodAfter: 3 }),
    ]
    expect(computeAvgMoodChange(sessions)).toBe(0)
  })

  it('ignores sessions without both moods', () => {
    const sessions = [
      makeSession({ moodBefore: 5, moodAfter: 2 }),       // change = 3
      makeSession({ id: 2, moodBefore: 3 }),                // no after — skip
      makeSession({ id: 3, moodAfter: 1 }),                 // no before — skip
      makeSession({ id: 4, moodBefore: 4, moodAfter: 3 }), // change = 1
    ]
    expect(computeAvgMoodChange(sessions)).toBe(2) // (3 + 1) / 2
  })

  it('rounds to one decimal', () => {
    const sessions = [
      makeSession({ moodBefore: 5, moodAfter: 3 }),  // 2
      makeSession({ id: 2, moodBefore: 4, moodAfter: 3 }),  // 1
      makeSession({ id: 3, moodBefore: 3, moodAfter: 2 }),  // 1
    ]
    expect(computeAvgMoodChange(sessions)).toBe(1.3) // 4/3 = 1.333...
  })
})

describe('computePreferredTime', () => {
  it('returns null for empty array', () => {
    expect(computePreferredTime([])).toBeNull()
  })

  it('identifies morning (5-12)', () => {
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    const sessions = [makeSession({ timestamp: d.getTime() })]
    expect(computePreferredTime(sessions)).toBe('morning')
  })

  it('identifies afternoon (12-17)', () => {
    const d = new Date()
    d.setHours(14, 0, 0, 0)
    const sessions = [makeSession({ timestamp: d.getTime() })]
    expect(computePreferredTime(sessions)).toBe('afternoon')
  })

  it('identifies evening (17-22)', () => {
    const d = new Date()
    d.setHours(20, 0, 0, 0)
    const sessions = [makeSession({ timestamp: d.getTime() })]
    expect(computePreferredTime(sessions)).toBe('evening')
  })

  it('identifies night (22-5)', () => {
    const d = new Date()
    d.setHours(1, 0, 0, 0)
    const sessions = [makeSession({ timestamp: d.getTime() })]
    expect(computePreferredTime(sessions)).toBe('night')
  })

  it('picks the most frequent bucket', () => {
    const morning = new Date(); morning.setHours(9, 0, 0, 0)
    const evening1 = new Date(); evening1.setHours(19, 0, 0, 0)
    const evening2 = new Date(); evening2.setHours(20, 0, 0, 0)
    const sessions = [
      makeSession({ id: 1, timestamp: morning.getTime() }),
      makeSession({ id: 2, timestamp: evening1.getTime() }),
      makeSession({ id: 3, timestamp: evening2.getTime() }),
    ]
    expect(computePreferredTime(sessions)).toBe('evening')
  })
})

describe('computeBestPattern', () => {
  it('returns null for empty array', () => {
    expect(computeBestPattern([])).toBeNull()
  })

  it('returns null when no mood data', () => {
    const sessions = [makeSession(), makeSession({ id: 2 })]
    expect(computeBestPattern(sessions)).toBeNull()
  })

  it('returns null when no pattern shows improvement', () => {
    const sessions = [
      makeSession({ moodBefore: 2, moodAfter: 3 }),  // worsened
      makeSession({ id: 2, patternId: 'sama', patternName: 'Sama', moodBefore: 3, moodAfter: 3 }), // same
    ]
    expect(computeBestPattern(sessions)).toBeNull()
  })

  it('finds the pattern with best avg improvement', () => {
    const sessions = [
      makeSession({ id: 1, patternId: 'pralokita', moodBefore: 5, moodAfter: 2 }), // +3
      makeSession({ id: 2, patternId: 'pralokita', moodBefore: 4, moodAfter: 3 }), // +1 → avg 2
      makeSession({ id: 3, patternId: 'sama', patternName: 'Sama', moodBefore: 5, moodAfter: 1 }), // +4 → avg 4
    ]
    expect(computeBestPattern(sessions)).toBe('sama')
  })

  it('ignores sessions without both moods', () => {
    const sessions = [
      makeSession({ id: 1, patternId: 'pralokita', moodBefore: 5, moodAfter: 2 }), // +3
      makeSession({ id: 2, patternId: 'sama', patternName: 'Sama', moodBefore: 3 }), // no after — skip
    ]
    expect(computeBestPattern(sessions)).toBe('pralokita')
  })
})

describe('computeStats extended fields', () => {
  it('includes completion rate', () => {
    const sessions = [
      makeSession({ id: 1, completed: true }),
      makeSession({ id: 2, completed: false }),
      makeSession({ id: 3, completed: true }),
      makeSession({ id: 4, completed: true }),
    ]
    expect(computeStats(sessions).completionRate).toBe(75)
  })

  it('computes avg duration', () => {
    const sessions = [
      makeSession({ id: 1, elapsed: 60000 }),
      makeSession({ id: 2, elapsed: 120000 }),
    ]
    expect(computeStats(sessions).avgDurationMs).toBe(90000)
  })

  it('includes all extended fields in empty result', () => {
    const stats = computeStats([])
    expect(stats.avgMoodChange).toBeNull()
    expect(stats.completionRate).toBe(0)
    expect(stats.avgDurationMs).toBe(0)
    expect(stats.preferredTimeOfDay).toBeNull()
    expect(stats.bestPatternId).toBeNull()
  })
})
