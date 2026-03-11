export type TrajectoryType = 'horizontal' | 'vertical' | 'circular' | 'diagonal' | 'figure8' | 'fixation'
export type EasingType = 'linear' | 'sine' | 'ease-in-out'
export type AudioMode = 'bilateral' | 'binaural' | 'drone' | 'rhythmic'
export type VisualType = 'bindu' | 'flame'
export type PatternCategory = 'drishti' | 'emdr' | 'sleep'
export type BinduColorToken = 'saffron' | 'teal' | 'lotus' | 'indigo'

export type BackgroundPatternId = 'zen' | 'aura' | 'ripples' | 'fibonacci' | 'seed-of-life' | 'mandala' | 'flower-of-life' | 'metatrons-cube' | 'penrose' | 'moire' | 'standing-wave' | 'perlin-flow' | 'chladni'
export type BackgroundRotation = 'none' | 'cw' | 'ccw'

export const allBackgroundPatterns: BackgroundPatternId[] = [
  'zen', 'aura', 'ripples', 'fibonacci', 'seed-of-life', 'mandala', 'flower-of-life', 'metatrons-cube', 'penrose', 'moire', 'standing-wave', 'perlin-flow', 'chladni',
]

/** Backgrounds where rotation visually matters */
export const rotatableBackgrounds = new Set<BackgroundPatternId>([
  'fibonacci', 'seed-of-life', 'mandala', 'flower-of-life', 'metatrons-cube', 'penrose',
])

export interface Phase {
  type: 'movement' | 'fixation' | 'eyes-closed'
  duration: number
  instruction?: string
}

export interface AudioConfig {
  mode: AudioMode
  frequency: number
  waveform: OscillatorType
  binauralDelta?: number
  rhythmBPM?: number
  droneIntervals?: number[]
  /** Hz offset for dual-oscillator bilateral (creates richer tone). Pralokita: 2 */
  bilateralDetune?: number
  /** Hz range for Y-position pitch bend on rhythmic patterns. Ullokita: 15 */
  pitchBendRange?: number
  /** ms interval between singing bowl strikes on drone. Sama: 35000 */
  singingBowlInterval?: number
  /** Gain (0-1) for pink noise layer mixed into drone. Nimilita: 0.03 */
  pinkNoise?: number
  /** Hz range for slow pitch LFO on drone oscillators. Trataka: 3 */
  pitchLFO?: number
  /** Hz for added sub-bass oscillator on rhythmic. Avalokita: 65 */
  subBass?: number
}

export interface TrajectoryParams {
  amplitude: number
  easing: EasingType
  bias?: 'up' | 'down'
}

export interface PatternConfig {
  id: string
  name: string
  nameSanskrit: string
  nameDevanagari: string
  description: string
  category: PatternCategory
  binduColor: BinduColorToken

  trajectory: TrajectoryType
  trajectoryParams: TrajectoryParams
  visual: VisualType

  cycleDuration: number | null
  defaultSessionDuration: number
  phases: Phase[]

  audioConfig: AudioConfig

  origins: string
  benefits: string[]
  requiresHeadphones: boolean
  instruction: string
  effect: string

  defaultBackground: BackgroundPatternId
  defaultBackgroundRotation: BackgroundRotation
}
