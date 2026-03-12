import { describe, it, expect } from 'vitest'
import {
  detectPhaseTransition,
  type PhaseTransitionState,
  type PhaseType,
} from './phaseTransitionDetector'

function createState(): PhaseTransitionState {
  return { lastPhaseType: null }
}

describe('detectPhaseTransition', () => {
  // ── Entering eyes-closed ──────────────────────────────

  it('movement -> eyes-closed: returns close', () => {
    const state = createState()
    state.lastPhaseType = 'movement'
    expect(detectPhaseTransition(state, 'eyes-closed')).toBe('close')
  })

  it('fixation -> eyes-closed: returns close', () => {
    const state = createState()
    state.lastPhaseType = 'fixation'
    expect(detectPhaseTransition(state, 'eyes-closed')).toBe('close')
  })

  // ── Leaving eyes-closed ───────────────────────────────

  it('eyes-closed -> movement: returns open', () => {
    const state = createState()
    state.lastPhaseType = 'eyes-closed'
    expect(detectPhaseTransition(state, 'movement')).toBe('open')
  })

  it('eyes-closed -> fixation: returns open', () => {
    const state = createState()
    state.lastPhaseType = 'eyes-closed'
    expect(detectPhaseTransition(state, 'fixation')).toBe('open')
  })

  // ── Non-eyes-closed transitions: no signal ────────────

  it('movement -> fixation: returns null', () => {
    const state = createState()
    state.lastPhaseType = 'movement'
    expect(detectPhaseTransition(state, 'fixation')).toBeNull()
  })

  it('fixation -> movement: returns null', () => {
    const state = createState()
    state.lastPhaseType = 'fixation'
    expect(detectPhaseTransition(state, 'movement')).toBeNull()
  })

  // ── Same phase repeated: no signal ────────────────────

  it('movement -> movement: returns null', () => {
    const state = createState()
    state.lastPhaseType = 'movement'
    expect(detectPhaseTransition(state, 'movement')).toBeNull()
  })

  it('fixation -> fixation: returns null', () => {
    const state = createState()
    state.lastPhaseType = 'fixation'
    expect(detectPhaseTransition(state, 'fixation')).toBeNull()
  })

  it('eyes-closed -> eyes-closed: returns null', () => {
    const state = createState()
    state.lastPhaseType = 'eyes-closed'
    expect(detectPhaseTransition(state, 'eyes-closed')).toBeNull()
  })

  // ── First frame: no signal ────────────────────────────

  it('null -> movement (first frame): returns null', () => {
    const state = createState()
    expect(detectPhaseTransition(state, 'movement')).toBeNull()
  })

  it('null -> fixation (first frame): returns null', () => {
    const state = createState()
    expect(detectPhaseTransition(state, 'fixation')).toBeNull()
  })

  it('null -> eyes-closed (first frame): returns null', () => {
    const state = createState()
    expect(detectPhaseTransition(state, 'eyes-closed')).toBeNull()
  })

  // ── State mutation ────────────────────────────────────

  it('updates lastPhaseType after each call', () => {
    const state = createState()
    detectPhaseTransition(state, 'movement')
    expect(state.lastPhaseType).toBe('movement')
    detectPhaseTransition(state, 'eyes-closed')
    expect(state.lastPhaseType).toBe('eyes-closed')
    detectPhaseTransition(state, 'fixation')
    expect(state.lastPhaseType).toBe('fixation')
  })

  // ── Full Trataka sequence ─────────────────────────────

  it('Trataka cycle: fixation -> close -> open -> close -> open -> close', () => {
    const state = createState()
    const sequence: PhaseType[] = [
      'fixation',     // phase 0: gaze at flame
      'eyes-closed',  // phase 1: close eyes
      'fixation',     // phase 2: open eyes
      'eyes-closed',  // phase 3: close eyes
      'fixation',     // phase 4: open eyes
      'eyes-closed',  // phase 5: close eyes (final)
    ]
    const signals = sequence.map((type) => detectPhaseTransition(state, type))
    expect(signals).toEqual([
      null,    // first frame
      'close', // fixation -> eyes-closed
      'open',  // eyes-closed -> fixation
      'close', // fixation -> eyes-closed
      'open',  // eyes-closed -> fixation
      'close', // fixation -> eyes-closed
    ])
  })

  // ── Anuvritta sequence (ends with eyes-closed) ────────

  it('Anuvritta: movement phases + fixation + final eyes-closed', () => {
    const state = createState()
    const sequence: PhaseType[] = [
      'movement', 'fixation', 'movement', 'fixation',
      'movement', 'fixation', 'movement', 'eyes-closed',
    ]
    const signals = sequence.map((type) => detectPhaseTransition(state, type))
    expect(signals).toEqual([
      null, null, null, null,
      null, null, null, 'close',
    ])
  })

  // ── Sama sequence (single eyes-closed in the middle) ──

  it('Sama: fixation -> fixation -> eyes-closed -> fixation', () => {
    const state = createState()
    const sequence: PhaseType[] = [
      'fixation', 'fixation', 'eyes-closed', 'fixation',
    ]
    const signals = sequence.map((type) => detectPhaseTransition(state, type))
    expect(signals).toEqual([
      null, null, 'close', 'open',
    ])
  })

  // ── Many frames within same phase: only first triggers ─

  it('repeated frames within same phase produce signal only once', () => {
    const state = createState()
    // 60fps = many frames per phase, only first frame of new phase triggers
    detectPhaseTransition(state, 'fixation')
    detectPhaseTransition(state, 'fixation')
    detectPhaseTransition(state, 'fixation')
    expect(detectPhaseTransition(state, 'eyes-closed')).toBe('close')
    expect(detectPhaseTransition(state, 'eyes-closed')).toBeNull()
    expect(detectPhaseTransition(state, 'eyes-closed')).toBeNull()
    expect(detectPhaseTransition(state, 'fixation')).toBe('open')
    expect(detectPhaseTransition(state, 'fixation')).toBeNull()
  })

  // ── Reset: null state after pause ─────────────────────

  it('after reset to null, next frame does not trigger signal', () => {
    const state = createState()
    detectPhaseTransition(state, 'fixation')
    detectPhaseTransition(state, 'eyes-closed') // 'close'
    // Simulate pause: reset state
    state.lastPhaseType = null
    // Resume into eyes-closed: no signal (as if first frame)
    expect(detectPhaseTransition(state, 'eyes-closed')).toBeNull()
  })

  it('after reset to null, transition from resumed type still works', () => {
    const state = createState()
    detectPhaseTransition(state, 'eyes-closed')
    state.lastPhaseType = null
    detectPhaseTransition(state, 'fixation') // first frame after reset, no signal
    expect(detectPhaseTransition(state, 'eyes-closed')).toBe('close')
  })
})
