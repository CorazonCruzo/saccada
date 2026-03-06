export type TrajectoryType = 'horizontal' | 'vertical' | 'circular' | 'diagonal' | 'figure8' | 'fixation'
export type EasingType = 'linear' | 'sine' | 'ease-in-out'
export type AudioMode = 'bilateral' | 'binaural' | 'drone' | 'rhythmic'
export type VisualType = 'bindu' | 'flame'
export type PatternCategory = 'drishti' | 'emdr' | 'sleep'
export type BinduColorToken = 'saffron' | 'teal' | 'lotus' | 'indigo'

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
}
