import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import { useSessionStore } from '@/entities/session'
import { pralokita } from '@/entities/pattern'

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

const mockSleep = vi.fn()
class MockGazeLog {
  record = vi.fn()
  getPoints = vi.fn().mockReturnValue([])
}

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

/** Advance through 3-second countdown to reach active phase */
async function advancePastCountdown() {
  // countdown: 3 → 2 → 1 → 0 → active
  for (let i = 0; i < 4; i++) {
    await act(async () => { vi.advanceTimersByTime(1000) })
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

    await advancePastCountdown()

    // Now in active phase. Press Escape.
    pressKey('Escape')

    // Should be in cooldown — verify via session state
    expect(useSessionStore.getState().sessionState).toBe('cooldown')

    // Audio should be stopped (cooldown effect calls audioEngine.stop)
    expect(mockAudioEngine.stop).toHaveBeenCalled()

    // Should NOT navigate to home
    expect(mockNavigate).not.toHaveBeenCalledWith('/', expect.anything())

    // Advance through cooldown timer (3 seconds)
    await act(async () => { vi.advanceTimersByTime(3000) })

    // Should navigate to mood-check, not home
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

    await advancePastCountdown()

    // Pause first with Space
    pressKey(' ')
    expect(useSessionStore.getState().sessionState).toBe('paused')

    // Now press Escape while paused
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

    await advancePastCountdown()

    // First Escape — enters cooldown
    pressKey('Escape')
    expect(useSessionStore.getState().sessionState).toBe('cooldown')

    // Second Escape — should be ignored
    pressKey('Escape')
    expect(useSessionStore.getState().sessionState).toBe('cooldown')

    await act(async () => { vi.advanceTimersByTime(3000) })

    // Navigate should be called exactly once
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

    await advancePastCountdown()

    pressKey('Escape')

    await act(async () => { vi.advanceTimersByTime(3000) })

    // Session should be saved
    const { lastSession } = useSessionStore.getState()
    expect(lastSession).not.toBeNull()
    expect(lastSession!.patternId).toBe(pralokita.id)

    unmount()
  })
})
