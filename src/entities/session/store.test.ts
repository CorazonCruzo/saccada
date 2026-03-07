import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './store'
import { pralokita, sama, anuvritta, allPatterns } from '@/entities/pattern'

// Reset store between tests
beforeEach(() => {
  useSessionStore.setState({
    sessionState: 'idle',
    selectedPattern: pralokita,
    sessionDuration: pralokita.defaultSessionDuration,
    speed: 1,
    volume: 50,
    soundEnabled: false,
    hapticEnabled: false,
    guidedMode: true,
    eyeTrackingEnabled: false,
    patternOverrides: {},
    visualScale: 1,
    calibratedAt: null,
    lastSession: null,
  })
})

describe('useSessionStore', () => {
  describe('pattern selection', () => {
    it('defaults to pralokita', () => {
      expect(useSessionStore.getState().selectedPattern.id).toBe('pralokita')
    })

    it('changes pattern and loads default session duration', () => {
      useSessionStore.getState().selectPattern(sama)
      const state = useSessionStore.getState()
      expect(state.selectedPattern.id).toBe('sama')
      expect(state.sessionDuration).toBe(sama.defaultSessionDuration)
    })

    it('loads saved per-pattern settings when selecting', () => {
      // Configure pralokita with speed 2
      useSessionStore.getState().setSpeed(2)
      expect(useSessionStore.getState().speed).toBe(2)

      // Switch to sama
      useSessionStore.getState().selectPattern(sama)
      expect(useSessionStore.getState().speed).toBe(1) // default

      // Switch back to pralokita: speed 2 restored
      useSessionStore.getState().selectPattern(pralokita)
      expect(useSessionStore.getState().speed).toBe(2)
    })

    it('loads default settings for pattern with no overrides', () => {
      useSessionStore.getState().selectPattern(anuvritta)
      const state = useSessionStore.getState()
      expect(state.speed).toBe(1)
      expect(state.volume).toBe(50)
      expect(state.soundEnabled).toBe(false)
      expect(state.hapticEnabled).toBe(false)
      expect(state.guidedMode).toBe(true)
      expect(state.sessionDuration).toBe(anuvritta.defaultSessionDuration)
    })
  })

  describe('per-pattern settings', () => {
    it('saves speed per pattern', () => {
      useSessionStore.getState().selectPattern(pralokita)
      useSessionStore.getState().setSpeed(1.5)

      useSessionStore.getState().selectPattern(sama)
      useSessionStore.getState().setSpeed(0.5)

      const overrides = useSessionStore.getState().patternOverrides
      expect(overrides['pralokita']?.speed).toBe(1.5)
      expect(overrides['sama']?.speed).toBe(0.5)
    })

    it('saves volume per pattern', () => {
      useSessionStore.getState().setVolume(80)
      expect(useSessionStore.getState().patternOverrides['pralokita']?.volume).toBe(80)
    })

    it('saves duration per pattern', () => {
      useSessionStore.getState().setSessionDuration(120_000)
      expect(useSessionStore.getState().patternOverrides['pralokita']?.sessionDuration).toBe(120_000)
    })

    it('saves sound toggle per pattern', () => {
      useSessionStore.getState().toggleSound()
      expect(useSessionStore.getState().soundEnabled).toBe(true)
      expect(useSessionStore.getState().patternOverrides['pralokita']?.soundEnabled).toBe(true)
    })

    it('saves haptic toggle per pattern', () => {
      useSessionStore.getState().toggleHaptic()
      expect(useSessionStore.getState().hapticEnabled).toBe(true)
      expect(useSessionStore.getState().patternOverrides['pralokita']?.hapticEnabled).toBe(true)
    })

    it('saves guided toggle per pattern', () => {
      useSessionStore.getState().toggleGuided()
      expect(useSessionStore.getState().guidedMode).toBe(false)
      expect(useSessionStore.getState().patternOverrides['pralokita']?.guidedMode).toBe(false)
    })

    it('does not leak settings between patterns', () => {
      // Set pralokita to speed 2, sound on
      useSessionStore.getState().setSpeed(2)
      useSessionStore.getState().toggleSound()

      // Switch to sama: should have defaults
      useSessionStore.getState().selectPattern(sama)
      expect(useSessionStore.getState().speed).toBe(1)
      expect(useSessionStore.getState().soundEnabled).toBe(false)

      // Modify sama
      useSessionStore.getState().setSpeed(0.5)

      // Back to pralokita: should have its saved settings
      useSessionStore.getState().selectPattern(pralokita)
      expect(useSessionStore.getState().speed).toBe(2)
      expect(useSessionStore.getState().soundEnabled).toBe(true)
    })
  })

  describe('session state', () => {
    it('transitions state', () => {
      useSessionStore.getState().setSessionState('countdown')
      expect(useSessionStore.getState().sessionState).toBe('countdown')

      useSessionStore.getState().setSessionState('active')
      expect(useSessionStore.getState().sessionState).toBe('active')
    })
  })

  describe('last session', () => {
    it('saves session results', () => {
      const session = {
        patternId: 'pralokita',
        patternName: 'Pralokita',
        elapsed: 60000,
        completed: true,
        timestamp: Date.now(),
      }
      useSessionStore.getState().setLastSession(session)
      expect(useSessionStore.getState().lastSession).toEqual(session)
    })
  })

  describe('eye tracking per pattern', () => {
    it('defaults to false', () => {
      expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
    })

    it('saves eye tracking per pattern', () => {
      useSessionStore.getState().setEyeTracking(true)
      expect(useSessionStore.getState().eyeTrackingEnabled).toBe(true)
      expect(useSessionStore.getState().patternOverrides['pralokita']?.eyeTrackingEnabled).toBe(true)
    })

    it('restores eye tracking on pattern switch', () => {
      useSessionStore.getState().setEyeTracking(true)
      useSessionStore.getState().selectPattern(sama)
      expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false) // default

      useSessionStore.getState().selectPattern(pralokita)
      expect(useSessionStore.getState().eyeTrackingEnabled).toBe(true) // restored
    })

    it('does not leak between patterns', () => {
      useSessionStore.getState().setEyeTracking(true)
      useSessionStore.getState().selectPattern(anuvritta)
      expect(useSessionStore.getState().eyeTrackingEnabled).toBe(false)
    })
  })

  describe('visual scale', () => {
    it('defaults to 1', () => {
      expect(useSessionStore.getState().visualScale).toBe(1)
    })

    it('sets visual scale', () => {
      useSessionStore.getState().setVisualScale(1.5)
      expect(useSessionStore.getState().visualScale).toBe(1.5)
    })

    it('clamps to min 0.3', () => {
      useSessionStore.getState().setVisualScale(0.1)
      expect(useSessionStore.getState().visualScale).toBe(0.3)
    })

    it('clamps to max 3', () => {
      useSessionStore.getState().setVisualScale(5)
      expect(useSessionStore.getState().visualScale).toBe(3)
    })

    it('is not affected by pattern switch', () => {
      useSessionStore.getState().setVisualScale(2)
      useSessionStore.getState().selectPattern(sama)
      expect(useSessionStore.getState().visualScale).toBe(2)
    })
  })

  describe('all patterns have valid configs', () => {
    it('every pattern has required fields', () => {
      for (const p of allPatterns) {
        expect(p.id).toBeTruthy()
        expect(p.name).toBeTruthy()
        expect(p.phases.length).toBeGreaterThan(0)
        expect(p.defaultSessionDuration).toBeGreaterThan(0)
        expect(['bilateral', 'binaural', 'drone', 'rhythmic']).toContain(p.audioConfig.mode)
        expect(['horizontal', 'vertical', 'circular', 'diagonal', 'figure8', 'fixation']).toContain(p.trajectory)
      }
    })

    it('binaural patterns require headphones', () => {
      for (const p of allPatterns) {
        if (p.audioConfig.mode === 'binaural') {
          expect(p.requiresHeadphones).toBe(true)
        }
      }
    })

    it('fixation patterns have null cycleDuration', () => {
      for (const p of allPatterns) {
        if (p.trajectory === 'fixation') {
          expect(p.cycleDuration).toBeNull()
        }
      }
    })

    it('moving patterns have positive cycleDuration', () => {
      for (const p of allPatterns) {
        if (p.trajectory !== 'fixation') {
          expect(p.cycleDuration).toBeGreaterThan(0)
        }
      }
    })

    it('phase durations sum to reasonable values', () => {
      for (const p of allPatterns) {
        const totalPhaseMs = p.phases.reduce((sum, ph) => sum + ph.duration, 0)
        expect(totalPhaseMs).toBeGreaterThan(0)
        expect(totalPhaseMs).toBeLessThanOrEqual(600_000) // max 10 min
      }
    })
  })
})
