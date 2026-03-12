export type PhaseType = 'movement' | 'fixation' | 'eyes-closed'

export interface PhaseTransitionState {
  lastPhaseType: PhaseType | null
}

export type TransitionSignal = 'close' | 'open' | null

/**
 * Detect eyes-closed phase transitions and return the appropriate bell signal.
 *
 * - Entering eyes-closed from any other phase -> 'close'
 * - Leaving eyes-closed to any other phase -> 'open'
 * - Any other transition (movement <-> fixation) -> null
 * - First frame (no previous type) -> null
 * - Same phase type repeated -> null
 *
 * Mutates `state.lastPhaseType` to track the current phase.
 */
export function detectPhaseTransition(
  state: PhaseTransitionState,
  currentType: PhaseType,
): TransitionSignal {
  const prev = state.lastPhaseType
  state.lastPhaseType = currentType

  if (prev === null || prev === currentType) return null

  if (currentType === 'eyes-closed') return 'close'
  if (prev === 'eyes-closed') return 'open'

  return null
}
