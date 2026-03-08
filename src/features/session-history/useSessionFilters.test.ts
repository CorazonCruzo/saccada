import { describe, it, expect } from 'vitest'
import { filterSessions } from './useSessionFilters'
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

describe('filterSessions', () => {
  describe('period filter', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: Date.now() }),                  // today
      makeSession({ id: 2, timestamp: Date.now() - 3 * DAY }),        // 3 days ago
      makeSession({ id: 3, timestamp: Date.now() - 10 * DAY }),       // 10 days ago
      makeSession({ id: 4, timestamp: Date.now() - 45 * DAY }),       // 45 days ago
    ]

    it('"all" returns all sessions', () => {
      const result = filterSessions(sessions, 'all', { from: '', to: '' }, new Set())
      expect(result).toHaveLength(4)
    })

    it('"week" returns sessions from last 7 days', () => {
      const result = filterSessions(sessions, 'week', { from: '', to: '' }, new Set())
      expect(result).toHaveLength(2)
      expect(result.map((s) => s.id)).toEqual([1, 2])
    })

    it('"month" returns sessions from last 30 days', () => {
      const result = filterSessions(sessions, 'month', { from: '', to: '' }, new Set())
      expect(result).toHaveLength(3)
      expect(result.map((s) => s.id)).toEqual([1, 2, 3])
    })

    it('"custom" filters by date range', () => {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const weekAgo = new Date(Date.now() - 7 * DAY)
      const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`

      const result = filterSessions(sessions, 'custom', { from: weekAgoStr, to: todayStr }, new Set())
      expect(result).toHaveLength(2) // today and 3 days ago
    })

    it('"custom" with empty range returns all', () => {
      const result = filterSessions(sessions, 'custom', { from: '', to: '' }, new Set())
      expect(result).toHaveLength(4)
    })
  })

  describe('pattern filter', () => {
    const sessions = [
      makeSession({ id: 1, patternId: 'pralokita' }),
      makeSession({ id: 2, patternId: 'sama' }),
      makeSession({ id: 3, patternId: 'pralokita' }),
      makeSession({ id: 4, patternId: 'trataka' }),
    ]

    it('empty set returns all sessions (no filter)', () => {
      const result = filterSessions(sessions, 'all', { from: '', to: '' }, new Set())
      expect(result).toHaveLength(4)
    })

    it('single pattern filters correctly', () => {
      const result = filterSessions(sessions, 'all', { from: '', to: '' }, new Set(['pralokita']))
      expect(result).toHaveLength(2)
      expect(result.every((s) => s.patternId === 'pralokita')).toBe(true)
    })

    it('multiple patterns filter correctly', () => {
      const result = filterSessions(sessions, 'all', { from: '', to: '' }, new Set(['sama', 'trataka']))
      expect(result).toHaveLength(2)
      expect(result.map((s) => s.patternId)).toEqual(['sama', 'trataka'])
    })
  })

  describe('combined filters', () => {
    const sessions = [
      makeSession({ id: 1, patternId: 'pralokita', timestamp: Date.now() }),
      makeSession({ id: 2, patternId: 'sama', timestamp: Date.now() }),
      makeSession({ id: 3, patternId: 'pralokita', timestamp: Date.now() - 10 * DAY }),
      makeSession({ id: 4, patternId: 'sama', timestamp: Date.now() - 10 * DAY }),
    ]

    it('week + pralokita returns only recent pralokita sessions', () => {
      const result = filterSessions(sessions, 'week', { from: '', to: '' }, new Set(['pralokita']))
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('month + sama returns all sama sessions within 30 days', () => {
      const result = filterSessions(sessions, 'month', { from: '', to: '' }, new Set(['sama']))
      expect(result).toHaveLength(2)
    })
  })
})
