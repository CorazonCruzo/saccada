import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeStats, computeStreak } from './stats'
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
