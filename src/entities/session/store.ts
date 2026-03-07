import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type PatternConfig, pralokita, patternsById } from '@/entities/pattern'
import type { SessionState } from './types'

interface LastSession {
  patternId: string
  patternName: string
  elapsed: number
  completed: boolean
  timestamp: number
}

export interface PatternSettings {
  sessionDuration: number
  speed: number
  volume: number
  soundEnabled: boolean
  hapticEnabled: boolean
  guidedMode: boolean
  eyeTrackingEnabled: boolean
}

const DEFAULT_SETTINGS: Omit<PatternSettings, 'sessionDuration'> = {
  speed: 1,
  volume: 50,
  soundEnabled: false,
  hapticEnabled: false,
  guidedMode: true,
  eyeTrackingEnabled: false,
}

interface SessionStore {
  // State machine
  sessionState: SessionState
  setSessionState: (state: SessionState) => void

  // Pattern
  selectedPattern: PatternConfig
  selectPattern: (p: PatternConfig) => void

  // Active settings (derived from per-pattern overrides)
  sessionDuration: number
  setSessionDuration: (d: number) => void
  speed: number
  setSpeed: (s: number) => void
  volume: number
  setVolume: (v: number) => void
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  toggleSound: () => void
  hapticEnabled: boolean
  toggleHaptic: () => void
  guidedMode: boolean
  toggleGuided: () => void
  eyeTrackingEnabled: boolean
  setEyeTracking: (v: boolean) => void

  // Per-pattern settings storage
  patternOverrides: Record<string, Partial<PatternSettings>>

  // Global settings (singleton, not per-pattern)
  visualScale: number
  setVisualScale: (s: number) => void
  calibratedAt: number | null
  setCalibratedAt: (t: number | null) => void

  // Results
  lastSession: LastSession | null
  setLastSession: (s: LastSession) => void
}

/** Save a single setting to the current pattern's overrides */
function saveOverride(
  get: () => SessionStore,
  field: keyof PatternSettings,
  value: number | boolean,
) {
  const { selectedPattern, patternOverrides } = get()
  const id = selectedPattern.id
  return {
    patternOverrides: {
      ...patternOverrides,
      [id]: { ...patternOverrides[id], [field]: value },
    },
  }
}

/** Load settings for a pattern from overrides (or defaults) */
function loadSettings(
  overrides: Record<string, Partial<PatternSettings>>,
  pattern: PatternConfig,
) {
  const po = overrides[pattern.id] ?? {}
  return {
    sessionDuration: po.sessionDuration ?? pattern.defaultSessionDuration,
    speed: po.speed ?? DEFAULT_SETTINGS.speed,
    volume: po.volume ?? DEFAULT_SETTINGS.volume,
    soundEnabled: po.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
    hapticEnabled: po.hapticEnabled ?? DEFAULT_SETTINGS.hapticEnabled,
    guidedMode: po.guidedMode ?? DEFAULT_SETTINGS.guidedMode,
    eyeTrackingEnabled: po.eyeTrackingEnabled ?? DEFAULT_SETTINGS.eyeTrackingEnabled,
  }
}

interface PersistedState {
  patternOverrides?: Record<string, Partial<PatternSettings>>
  _selectedPatternId?: string
  visualScale?: number
  calibratedAt?: number | null
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessionState: 'idle' as SessionState,
      setSessionState: (sessionState) => set({ sessionState }),

      selectedPattern: pralokita,
      selectPattern: (p) => set({
        selectedPattern: p,
        ...loadSettings(get().patternOverrides, p),
      }),

      sessionDuration: pralokita.defaultSessionDuration,
      setSessionDuration: (sessionDuration) => set({
        sessionDuration,
        ...saveOverride(get, 'sessionDuration', sessionDuration),
      }),

      speed: DEFAULT_SETTINGS.speed,
      setSpeed: (speed) => set({
        speed,
        ...saveOverride(get, 'speed', speed),
      }),

      volume: DEFAULT_SETTINGS.volume,
      setVolume: (volume) => set({
        volume,
        ...saveOverride(get, 'volume', volume),
      }),

      soundEnabled: DEFAULT_SETTINGS.soundEnabled,
      setSoundEnabled: (soundEnabled) => set({
        soundEnabled,
        ...saveOverride(get, 'soundEnabled', soundEnabled),
      }),
      toggleSound: () => {
        const next = !get().soundEnabled
        set({
          soundEnabled: next,
          ...saveOverride(get, 'soundEnabled', next),
        })
      },

      hapticEnabled: DEFAULT_SETTINGS.hapticEnabled,
      toggleHaptic: () => {
        const next = !get().hapticEnabled
        set({
          hapticEnabled: next,
          ...saveOverride(get, 'hapticEnabled', next),
        })
      },

      guidedMode: DEFAULT_SETTINGS.guidedMode,
      toggleGuided: () => {
        const next = !get().guidedMode
        set({
          guidedMode: next,
          ...saveOverride(get, 'guidedMode', next),
        })
      },

      eyeTrackingEnabled: DEFAULT_SETTINGS.eyeTrackingEnabled,
      setEyeTracking: (eyeTrackingEnabled) => set({
        eyeTrackingEnabled,
        ...saveOverride(get, 'eyeTrackingEnabled', eyeTrackingEnabled),
      }),

      patternOverrides: {},

      visualScale: 1,
      setVisualScale: (visualScale) => set({ visualScale: Math.max(0.3, Math.min(3, visualScale)) }),

      calibratedAt: null,
      setCalibratedAt: (calibratedAt) => set({ calibratedAt }),

      lastSession: null,
      setLastSession: (lastSession) => set({ lastSession }),
    }),
    {
      name: 'saccada-settings',
      partialize: (state) => ({
        patternOverrides: state.patternOverrides,
        _selectedPatternId: state.selectedPattern.id,
        visualScale: state.visualScale,
        calibratedAt: state.calibratedAt,
      }),
      merge: (persisted, current) => {
        const saved = persisted as PersistedState
        const overrides = saved.patternOverrides ?? {}
        const patternId = saved._selectedPatternId ?? 'pralokita'
        const pattern = patternsById[patternId] ?? pralokita

        return {
          ...current,
          patternOverrides: overrides,
          selectedPattern: pattern,
          ...loadSettings(overrides, pattern),
          visualScale: saved.visualScale ?? 1,
          calibratedAt: saved.calibratedAt ?? null,
        }
      },
    }
  )
)
