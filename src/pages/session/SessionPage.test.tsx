import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useSessionStore } from '@/entities/session'
import { pralokita } from '@/entities/pattern'
import { MIN_SESSION_DURATION_MS } from './SessionPage'

// ── Mocks ──

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockAudioEngine = {
  init: vi.fn(),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  setVolume: vi.fn(),
  setPan: vi.fn(),
}
vi.mock('@/features/audio', () => ({
  useAudio: () => mockAudioEngine,
}))

const { mockSleep, MockGazeLog } = vi.hoisted(() => {
  const mockSleep = vi.fn()
  class MockGazeLog {
    record = vi.fn()
    getPoints = vi.fn().mockReturnValue([])
  }
  return { mockSleep, MockGazeLog }
})

vi.mock('@/features/eye-tracking', () => ({
  useEyeTracking: () => ({
    getTracker: () => ({
      start: vi.fn().mockResolvedValue(undefined),
      sleep: vi.fn(),
      isRunning: vi.fn().mockReturnValue(false),
    }),
    sleep: mockSleep,
  }),
  GazeLog: MockGazeLog,
  createAdaptiveSpeedState: () => ({
    lastCheckTime: 0,
    distances: [],
    multiplier: 1,
  }),
  updateAdaptiveSpeed: () => 1,
}))

vi.mock('@/widgets/session-player', () => ({
  SessionPlayer: () => <div data-testid="session-player" />,
}))

vi.mock('@/widgets/pattern-picker', () => ({
  PatternInfoDialog: () => null,
}))

// ── Helpers ──

function resetStore() {
  useSessionStore.setState({
    sessionState: 'countdown',
    selectedPattern: pralokita,
    sessionDuration: pralokita.defaultSessionDuration,
    speed: 1,
    volume: 50,
    soundEnabled: false,
    hapticEnabled: false,
    guidedMode: false,
    eyeTrackingEnabled: false,
    patternOverrides: {},
    visualScale: 1,
    calibratedAt: null,
    moodBefore: null,
    lastSession: null,
  })
}

/** Advance through 3-second countdown + extra time in active phase */
async function advancePastCountdown(extraActiveMs: number = 0) {
  // countdown: 3 → 2 → 1 → 0 → active
  for (let i = 0; i < 3; i++) {
    await act(async () => { vi.advanceTimersByTime(1000) })
  }
  if (extraActiveMs > 0) {
    await act(async () => { vi.advanceTimersByTime(extraActiveMs) })
  }
}

function pressKey(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  })
}

// ── Tests ──

describe('SessionPage keyboard: Escape', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    resetStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Escape during active session transitions to cooldown (not home)', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    // Advance past countdown + spend enough time in active to exceed threshold
    await advancePastCountdown(MIN_SESSION_DURATION_MS + 500)

    pressKey('Escape')

    expect(useSessionStore.getState().sessionState).toBe('cooldown')
    expect(mockAudioEngine.stop).toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalledWith('/', expect.anything())

    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(mockNavigate).toHaveBeenCalledWith('/mood-check?phase=after', { replace: true })

    unmount()
  })

  it('Escape during paused session also transitions to cooldown', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    await advancePastCountdown(MIN_SESSION_DURATION_MS + 500)

    pressKey(' ')
    expect(useSessionStore.getState().sessionState).toBe('paused')

    pressKey('Escape')

    expect(useSessionStore.getState().sessionState).toBe('cooldown')
    expect(mockNavigate).not.toHaveBeenCalledWith('/', expect.anything())

    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(mockNavigate).toHaveBeenCalledWith('/mood-check?phase=after', { replace: true })

    unmount()
  })

  it('Escape during cooldown is a no-op (does not double-trigger)', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    await advancePastCountdown(MIN_SESSION_DURATION_MS + 500)

    pressKey('Escape')
    expect(useSessionStore.getState().sessionState).toBe('cooldown')

    pressKey('Escape')
    expect(useSessionStore.getState().sessionState).toBe('cooldown')

    await act(async () => { vi.advanceTimersByTime(3000) })

    const moodCheckCalls = mockNavigate.mock.calls.filter(
      (c: [string, object?]) => c[0] === '/mood-check?phase=after',
    )
    expect(moodCheckCalls).toHaveLength(1)

    unmount()
  })

  it('session data is saved on Escape (setLastSession called)', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    await advancePastCountdown(MIN_SESSION_DURATION_MS + 500)

    pressKey('Escape')

    await act(async () => { vi.advanceTimersByTime(3000) })

    const { lastSession } = useSessionStore.getState()
    expect(lastSession).not.toBeNull()
    expect(lastSession!.patternId).toBe(pralokita.id)

    unmount()
  })
})

describe('SessionPage: zero-duration session discard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    resetStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Escape during countdown discards session and navigates home', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    // Escape during countdown: elapsed = 0
    pressKey('Escape')

    expect(useSessionStore.getState().sessionState).toBe('cooldown')

    // Discard cooldown is 1s (shorter than normal 3s)
    await act(async () => { vi.advanceTimersByTime(1000) })

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/mood-check?phase=after',
      expect.anything(),
    )

    expect(useSessionStore.getState().lastSession).toBeNull()
    expect(useSessionStore.getState().sessionState).toBe('idle')

    unmount()
  })

  it('discarded session does not trigger mood-check-after', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    // Escape during countdown
    pressKey('Escape')

    // Advance well past any timer
    await act(async () => { vi.advanceTimersByTime(5000) })

    const moodCheckCalls = mockNavigate.mock.calls.filter(
      (c: [string, object?]) => c[0]?.includes('mood-check'),
    )
    expect(moodCheckCalls).toHaveLength(0)

    unmount()
  })

  it('session with sufficient elapsed time is NOT discarded', async () => {
    const { unmount } = render(
      await import('./SessionPage').then((m) => {
        const Page = m.default
        return <Page />
      }),
    )

    // Spend enough time in active phase (well above threshold)
    await advancePastCountdown(MIN_SESSION_DURATION_MS + 1000)

    pressKey('Escape')

    // Normal cooldown (3s), not discard cooldown (1s)
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(mockNavigate).not.toHaveBeenCalledWith('/', { replace: true })

    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(mockNavigate).toHaveBeenCalledWith('/mood-check?phase=after', { replace: true })

    const { lastSession } = useSessionStore.getState()
    expect(lastSession).not.toBeNull()
    expect(lastSession!.elapsed).toBeGreaterThanOrEqual(MIN_SESSION_DURATION_MS)

    unmount()
  })

  it('MIN_SESSION_DURATION_MS threshold is 1 second', () => {
    expect(MIN_SESSION_DURATION_MS).toBe(1000)
  })
})
