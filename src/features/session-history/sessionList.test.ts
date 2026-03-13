import { describe, it, expect } from 'vitest'
import { groupSessionsByDay, getSessionFocusScore, computeAvgFocusScore } from './sessionList'
import type { SessionRecord } from '@/shared/lib/db'
import type { PatternConfig } from '@/entities/pattern'
import type { Translation } from '@/shared/lib/i18n/types'

const DAY = 86400000

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

function makePattern(overrides: Partial<PatternConfig> = {}): PatternConfig {
  return {
    id: 'pralokita',
    name: 'Pralokita',
    nameSanskrit: '',
    nameDevanagari: '',
    description: '',
    category: 'emdr',
    binduColor: 'saffron',
    sessionType: 'processing',
    recommendedDuration: 600_000,
    trajectory: 'horizontal',
    trajectoryParams: { amplitude: 0.4, easing: 'sine' },
    visual: 'bindu',
    cycleDuration: 1600,
    defaultSessionDuration: 30000,
    phases: [{ type: 'movement', duration: 30000 }],
    audioConfig: { mode: 'bilateral', frequency: 396, waveform: 'sine' },
    origins: '',
    benefits: [],
    requiresHeadphones: false,
    instruction: '',
    effect: '',
    evidenceLevel: 'researched',
    defaultBackground: 'mandala',
    defaultBackgroundRotation: 'cw',
    ...overrides,
  }
}

const fakeT = {
  history: {
    calendarToday: 'Today',
    yesterday: 'Yesterday',
  },
} as unknown as Translation

describe('groupSessionsByDay', () => {
  // Fixed "now": 2026-03-09 12:00
  const now = new Date(2026, 2, 9, 12, 0, 0).getTime()

  it('returns empty array for no sessions', () => {
    expect(groupSessionsByDay([], 'en', fakeT, now)).toEqual([])
  })

  it('groups sessions from same day together', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 3600000 }), // 1h earlier, same day
    ]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    expect(groups).toHaveLength(1)
    expect(groups[0].sessions).toHaveLength(2)
  })

  it('separates sessions from different days', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - DAY }),
      makeSession({ id: 3, timestamp: now - 2 * DAY }),
    ]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    expect(groups).toHaveLength(3)
    expect(groups[0].sessions).toHaveLength(1)
    expect(groups[1].sessions).toHaveLength(1)
    expect(groups[2].sessions).toHaveLength(1)
  })

  it('labels today as "Today"', () => {
    const sessions = [makeSession({ id: 1, timestamp: now })]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    expect(groups[0].label).toBe('Today')
  })

  it('labels yesterday as "Yesterday"', () => {
    const sessions = [makeSession({ id: 1, timestamp: now - DAY })]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    expect(groups[0].label).toBe('Yesterday')
  })

  it('labels older days with formatted date', () => {
    const sessions = [makeSession({ id: 1, timestamp: now - 3 * DAY })]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    // Should not be "Today" or "Yesterday"
    expect(groups[0].label).not.toBe('Today')
    expect(groups[0].label).not.toBe('Yesterday')
    // Should be a non-empty string
    expect(groups[0].label.length).toBeGreaterThan(0)
  })

  it('preserves input order within groups', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now }),
      makeSession({ id: 2, timestamp: now - 1000 }),
      makeSession({ id: 3, timestamp: now - 2000 }),
    ]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    expect(groups[0].sessions.map((s) => s.id)).toEqual([1, 2, 3])
  })

  it('preserves group order (insertion order from input)', () => {
    const sessions = [
      makeSession({ id: 1, timestamp: now }),          // today
      makeSession({ id: 2, timestamp: now - DAY }),    // yesterday
      makeSession({ id: 3, timestamp: now }),          // today again
    ]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    // Today group comes first because first session is today
    expect(groups[0].label).toBe('Today')
    expect(groups[0].sessions).toHaveLength(2)
    expect(groups[1].label).toBe('Yesterday')
  })

  it('assigns correct dateKey', () => {
    const sessions = [makeSession({ id: 1, timestamp: now })]
    const groups = groupSessionsByDay(sessions, 'en', fakeT, now)
    expect(groups[0].dateKey).toBe('2026-03-09')
  })
})

describe('getSessionFocusScore', () => {
  const pattern = makePattern()

  it('returns null when gazePoints is undefined', () => {
    const session = makeSession({ gazePoints: undefined })
    expect(getSessionFocusScore(session, pattern)).toBeNull()
  })

  it('returns null when gazePoints is empty', () => {
    const session = makeSession({ gazePoints: [] })
    expect(getSessionFocusScore(session, pattern)).toBeNull()
  })

  it('returns null when gazePoints has fewer than 5 points', () => {
    const session = makeSession({
      gazePoints: [
        { x: 500, y: 400, t: 0 },
        { x: 500, y: 400, t: 100 },
        { x: 500, y: 400, t: 200 },
        { x: 500, y: 400, t: 300 },
      ],
    })
    expect(getSessionFocusScore(session, pattern)).toBeNull()
  })

  it('returns null when pattern is undefined', () => {
    const session = makeSession({
      gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
    })
    expect(getSessionFocusScore(session, undefined)).toBeNull()
  })

  it('returns a number 0-100 when gaze data is sufficient', () => {
    // Gaze points all at center — during fixation phase they'd be on target,
    // during movement they may or may not be
    const session = makeSession({
      gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
      viewportWidth: 1000,
      viewportHeight: 800,
    })
    const score = getSessionFocusScore(session, pattern)
    expect(score).not.toBeNull()
    expect(score!).toBeGreaterThanOrEqual(0)
    expect(score!).toBeLessThanOrEqual(100)
  })

  it('returns 100 when gaze exactly follows the dot', () => {
    // Fixation pattern — dot is always at center, gaze at center
    const fixationPattern = makePattern({
      trajectory: 'fixation',
      phases: [{ type: 'fixation', duration: 30000 }],
    })
    const session = makeSession({
      patternId: 'fixation',
      gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
      viewportWidth: 1000,
      viewportHeight: 800,
    })
    expect(getSessionFocusScore(session, fixationPattern)).toBe(100)
  })

  it('returns 0 when gaze is completely off target', () => {
    const fixationPattern = makePattern({
      trajectory: 'fixation',
      phases: [{ type: 'fixation', duration: 30000 }],
    })
    // Gaze at corner (0,0), dot at center (500,400) — distance ~640px, threshold ~192px
    const session = makeSession({
      gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 0, y: 0, t: i * 100 })),
      viewportWidth: 1000,
      viewportHeight: 800,
    })
    expect(getSessionFocusScore(session, fixationPattern)).toBe(0)
  })

  it('uses session viewportWidth/Height when available', () => {
    const fixationPattern = makePattern({
      trajectory: 'fixation',
      phases: [{ type: 'fixation', duration: 30000 }],
    })
    // Small viewport — gaze at (100,100), dot at (50,40) — close enough on small viewport
    const session = makeSession({
      gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 50, y: 40, t: i * 100 })),
      viewportWidth: 100,
      viewportHeight: 80,
    })
    expect(getSessionFocusScore(session, fixationPattern)).toBe(100)
  })

  it('defaults to 1000x800 when viewport not stored', () => {
    const fixationPattern = makePattern({
      trajectory: 'fixation',
      phases: [{ type: 'fixation', duration: 30000 }],
    })
    const session = makeSession({
      gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
      viewportWidth: undefined,
      viewportHeight: undefined,
    })
    // Should still work with default 1000x800, gaze at center = on target
    expect(getSessionFocusScore(session, fixationPattern)).toBe(100)
  })
})

describe('computeAvgFocusScore', () => {
  const fixationPattern = makePattern({
    id: 'fixation_test',
    trajectory: 'fixation',
    phases: [{ type: 'fixation', duration: 30000 }],
  })
  const patterns: Record<string, PatternConfig> = {
    fixation_test: fixationPattern,
  }

  it('returns null for empty sessions', () => {
    expect(computeAvgFocusScore([], patterns)).toBeNull()
  })

  it('returns null when no sessions have gaze data', () => {
    const sessions = [
      makeSession({ gazePoints: undefined }),
      makeSession({ gazePoints: [] }),
    ]
    expect(computeAvgFocusScore(sessions, patterns)).toBeNull()
  })

  it('returns 100 when all sessions have perfect focus', () => {
    const sessions = [
      makeSession({
        id: 1,
        patternId: 'fixation_test',
        gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
      makeSession({
        id: 2,
        patternId: 'fixation_test',
        gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
    ]
    expect(computeAvgFocusScore(sessions, patterns)).toBe(100)
  })

  it('skips sessions without gaze data in the average', () => {
    const sessions = [
      makeSession({
        id: 1,
        patternId: 'fixation_test',
        gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
      makeSession({ id: 2, gazePoints: undefined }), // no gaze data, skipped
    ]
    expect(computeAvgFocusScore(sessions, patterns)).toBe(100)
  })

  it('averages focus scores across sessions', () => {
    const sessions = [
      makeSession({
        id: 1,
        patternId: 'fixation_test',
        gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
      makeSession({
        id: 2,
        patternId: 'fixation_test',
        gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 0, y: 0, t: i * 100 })),
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
    ]
    const avg = computeAvgFocusScore(sessions, patterns)
    expect(avg).not.toBeNull()
    // One is 100%, other is 0%, average should be 50
    expect(avg).toBe(50)
  })

  it('returns null when pattern not found in map', () => {
    const sessions = [
      makeSession({
        id: 1,
        patternId: 'unknown_pattern',
        gazePoints: Array.from({ length: 10 }, (_, i) => ({ x: 500, y: 400, t: i * 100 })),
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
    ]
    expect(computeAvgFocusScore(sessions, patterns)).toBeNull()
  })
})
