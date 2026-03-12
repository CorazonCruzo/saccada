import { describe, it, expect } from 'vitest'
import {
  computeFocusScore,
  computeFocusScoreDirect,
  computeFocusTimeline,
  reconstructDotPositions,
  type GazePoint,
  type DotPosition,
} from './focusScore'
import type { PatternConfig } from '@/entities/pattern'

// Minimal pattern config for testing
function makePattern(overrides: Partial<PatternConfig> = {}): PatternConfig {
  return {
    id: 'test',
    name: 'Test',
    nameSanskrit: '',
    nameDevanagari: '',
    description: '',
    category: 'emdr',
    binduColor: 'saffron',
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
    defaultBackground: 'mandala',
    defaultBackgroundRotation: 'cw',
    ...overrides,
  }
}

const DIAG = Math.sqrt(1000 ** 2 + 800 ** 2) // ~1280.6
const THRESHOLD = DIAG * 0.25 // ~320

describe('computeFocusScore', () => {
  it('returns 0 for empty gaze points', () => {
    expect(computeFocusScore([], [{ x: 500, y: 400, t: 0 }], DIAG)).toBe(0)
  })

  it('returns 0 for empty dot positions', () => {
    expect(computeFocusScore([{ x: 500, y: 400, t: 0 }], [], DIAG)).toBe(0)
  })

  it('returns 100 when gaze is exactly on dot', () => {
    const gaze: GazePoint[] = [
      { x: 500, y: 400, t: 0 },
      { x: 600, y: 400, t: 100 },
      { x: 700, y: 400, t: 200 },
    ]
    const dots: DotPosition[] = [
      { x: 500, y: 400, t: 0 },
      { x: 600, y: 400, t: 100 },
      { x: 700, y: 400, t: 200 },
    ]
    expect(computeFocusScore(gaze, dots, DIAG)).toBe(100)
  })

  it('returns 0 when gaze is far from dot', () => {
    const gaze: GazePoint[] = [
      { x: 0, y: 0, t: 0 },
      { x: 0, y: 0, t: 100 },
    ]
    const dots: DotPosition[] = [
      { x: 900, y: 700, t: 0 },
      { x: 900, y: 700, t: 100 },
    ]
    expect(computeFocusScore(gaze, dots, DIAG)).toBe(0)
  })

  it('returns correct percentage for mixed results', () => {
    // Threshold = DIAG * 0.15 ≈ 192px
    const gaze: GazePoint[] = [
      { x: 500, y: 400, t: 0 },   // on target (dist=0)
      { x: 500, y: 400, t: 100 }, // on target (dist=0)
      { x: 0, y: 0, t: 200 },     // off target (dist ~640)
      { x: 500, y: 400, t: 300 }, // on target (dist=0)
    ]
    const dots: DotPosition[] = [
      { x: 500, y: 400, t: 0 },
      { x: 500, y: 400, t: 100 },
      { x: 500, y: 400, t: 200 },
      { x: 500, y: 400, t: 300 },
    ]
    expect(computeFocusScore(gaze, dots, DIAG)).toBe(75)
  })

  it('matches gaze to closest dot by timestamp', () => {
    const gaze: GazePoint[] = [{ x: 100, y: 100, t: 150 }]
    const dots: DotPosition[] = [
      { x: 0, y: 0, t: 0 },       // far in time
      { x: 100, y: 100, t: 140 },  // close in time, on target
      { x: 900, y: 900, t: 500 },  // far in time
    ]
    expect(computeFocusScore(gaze, dots, DIAG)).toBe(100)
  })

  it('counts points within 25% of diagonal as on-target', () => {
    const gaze: GazePoint[] = [
      { x: 500 + THRESHOLD - 1, y: 400, t: 0 }, // just inside
      { x: 500 + THRESHOLD + 1, y: 400, t: 100 }, // just outside
    ]
    const dots: DotPosition[] = [
      { x: 500, y: 400, t: 0 },
      { x: 500, y: 400, t: 100 },
    ]
    expect(computeFocusScore(gaze, dots, DIAG)).toBe(50)
  })
})

describe('computeFocusScoreDirect', () => {
  it('returns 0 for empty gaze points', () => {
    expect(computeFocusScoreDirect([], DIAG)).toBe(0)
  })

  it('returns 100 when gaze is exactly on recorded dot', () => {
    const gaze: GazePoint[] = [
      { x: 500, y: 400, t: 0, dotX: 500, dotY: 400 },
      { x: 600, y: 300, t: 100, dotX: 600, dotY: 300 },
    ]
    expect(computeFocusScoreDirect(gaze, DIAG)).toBe(100)
  })

  it('returns 0 when gaze is far from recorded dot', () => {
    const gaze: GazePoint[] = [
      { x: 0, y: 0, t: 0, dotX: 900, dotY: 700 },
      { x: 0, y: 0, t: 100, dotX: 900, dotY: 700 },
    ]
    expect(computeFocusScoreDirect(gaze, DIAG)).toBe(0)
  })

  it('returns correct mixed percentage', () => {
    const gaze: GazePoint[] = [
      { x: 500, y: 400, t: 0, dotX: 500, dotY: 400 },   // on target
      { x: 0, y: 0, t: 100, dotX: 500, dotY: 400 },       // off target
      { x: 501, y: 401, t: 200, dotX: 500, dotY: 400 },   // on target
      { x: 999, y: 0, t: 300, dotX: 500, dotY: 400 },     // off target
    ]
    expect(computeFocusScoreDirect(gaze, DIAG)).toBe(50)
  })

  it('uses 25% of diagonal as threshold', () => {
    const gaze: GazePoint[] = [
      { x: 500 + THRESHOLD - 1, y: 400, t: 0, dotX: 500, dotY: 400 }, // inside
      { x: 500 + THRESHOLD + 1, y: 400, t: 100, dotX: 500, dotY: 400 }, // outside
    ]
    expect(computeFocusScoreDirect(gaze, DIAG)).toBe(50)
  })
})

describe('computeFocusTimeline', () => {
  it('returns array of zeros for empty input', () => {
    const result = computeFocusTimeline([], [], DIAG, 5)
    expect(result).toEqual([0, 0, 0, 0, 0])
  })

  it('returns correct segment ratios', () => {
    // 10 gaze points over 1000ms, 5 segments of 200ms each
    const gaze: GazePoint[] = Array.from({ length: 10 }, (_, i) => ({
      x: i < 6 ? 500 : 0, // first 6 on target, last 4 off
      y: 400,
      t: i * 100, // 0, 100, 200, ... 900
    }))
    const dots: DotPosition[] = Array.from({ length: 10 }, (_, i) => ({
      x: 500, y: 400, t: i * 100,
    }))

    const result = computeFocusTimeline(gaze, dots, DIAG, 5)
    // Segment 0: t=0,100 → both on target → 1.0
    // Segment 1: t=200,300 → both on target → 1.0
    // Segment 2: t=400,500 → both on target → 1.0
    // Segment 3: t=600,700 → both off target → 0
    // Segment 4: t=800,900 → both off target → 0
    expect(result).toEqual([1, 1, 1, 0, 0])
  })

  it('handles single-point duration gracefully', () => {
    const gaze: GazePoint[] = [{ x: 500, y: 400, t: 100 }]
    const dots: DotPosition[] = [{ x: 500, y: 400, t: 100 }]
    const result = computeFocusTimeline(gaze, dots, DIAG, 3)
    // duration = 0, returns zeros
    expect(result).toEqual([0, 0, 0])
  })
})

describe('reconstructDotPositions', () => {
  it('returns center for fixation pattern', () => {
    const pattern = makePattern({
      trajectory: 'fixation',
      phases: [{ type: 'fixation', duration: 10000 }],
    })
    const result = reconstructDotPositions([0, 5000], pattern, 1000, 800)
    expect(result[0]).toEqual({ x: 500, y: 400, t: 0 })
    expect(result[1]).toEqual({ x: 500, y: 400, t: 5000 })
  })

  it('returns center during fixation phase of mixed pattern', () => {
    const pattern = makePattern({
      phases: [
        { type: 'movement', duration: 5000 },
        { type: 'fixation', duration: 5000 },
      ],
    })
    // relative t=7000 is in fixation phase (5000-10000)
    const result = reconstructDotPositions([0, 7000], pattern, 1000, 800)
    expect(result[1]).toEqual({ x: 500, y: 400, t: 7000 })
  })

  it('computes horizontal movement position at known time', () => {
    // Horizontal sine, amplitude 0.4, cycle 1600ms
    // At relative t=400ms (cycleT = 0.25), sine(0.25 * 2π) = sin(π/2) = 1.0
    // x_norm = 1.0 * 0.4 = 0.4
    // x_pixel = 500 + 0.4 * 500 = 700
    const pattern = makePattern()
    const result = reconstructDotPositions([0, 400], pattern, 1000, 800)
    expect(result[1].x).toBeCloseTo(700, 0)
    expect(result[1].y).toBeCloseTo(400, 0)
  })

  it('normalizes timestamps relative to first point', () => {
    // Gaze timestamps may start at arbitrary offset (e.g., WebGazer elapsed time)
    // [60000, 60400] should give same result as [0, 400]
    const pattern = makePattern()
    const fromZero = reconstructDotPositions([0, 400], pattern, 1000, 800)
    const withOffset = reconstructDotPositions([60000, 60400], pattern, 1000, 800)
    expect(withOffset[1].x).toBeCloseTo(fromZero[1].x, 5)
    expect(withOffset[1].y).toBeCloseTo(fromZero[1].y, 5)
  })

  it('loops phases when time exceeds total duration', () => {
    const pattern = makePattern({
      phases: [
        { type: 'movement', duration: 5000 },
        { type: 'fixation', duration: 5000 },
      ],
    })
    // relative t=17000 → loops to t=7000 (in fixation phase → center)
    const result = reconstructDotPositions([0, 17000], pattern, 1000, 800)
    expect(result[1]).toEqual({ x: 500, y: 400, t: 17000 })
  })

  it('returns center when total phase duration is 0', () => {
    const pattern = makePattern({ phases: [] })
    const result = reconstructDotPositions([100], pattern, 1000, 800)
    expect(result[0]).toEqual({ x: 500, y: 400, t: 100 })
  })

  it('applies speed multiplier to animation time', () => {
    // At speed=2, relative t=200ms → animTime=400ms
    // Horizontal sine, cycle 1600ms: cycleT=400/1600=0.25, sine(0.25*2π)=1.0
    // x_norm = 1.0 * 0.4 = 0.4 → x_pixel = 700
    const pattern = makePattern()
    const result = reconstructDotPositions([0, 200], pattern, 1000, 800, 2)
    expect(result[1].x).toBeCloseTo(700, 0)
    expect(result[1].y).toBeCloseTo(400, 0)
  })

  it('speed=1 matches default behavior', () => {
    const pattern = makePattern()
    const withDefault = reconstructDotPositions([0, 400], pattern, 1000, 800)
    const withSpeed1 = reconstructDotPositions([0, 400], pattern, 1000, 800, 1)
    expect(withDefault[1].x).toBeCloseTo(withSpeed1[1].x, 5)
    expect(withDefault[1].y).toBeCloseTo(withSpeed1[1].y, 5)
  })

  it('applies visualScale to trajectory amplitude', () => {
    // Default: amplitude 0.4, at relative t=400 → x=700 (0.4 * 500 + 500)
    // visualScale=0.5: amplitude effectively 0.2 → x = 0.2*500 + 500 = 600
    const pattern = makePattern()
    const result = reconstructDotPositions([0, 400], pattern, 1000, 800, 1, 0.5)
    expect(result[1].x).toBeCloseTo(600, 0)
    expect(result[1].y).toBeCloseTo(400, 0)
  })

  it('visualScale does not affect fixation (center)', () => {
    const pattern = makePattern({
      trajectory: 'fixation',
      phases: [{ type: 'fixation', duration: 10000 }],
    })
    const result = reconstructDotPositions([0, 500], pattern, 1000, 800, 1, 2)
    expect(result[1]).toEqual({ x: 500, y: 400, t: 500 })
  })

  it('speed + visualScale combined', () => {
    // speed=2, vs=0.5: relative t=200 → animTime=400 → cycleT=0.25 → sine=1.0
    // x_norm = 1.0 * 0.4 * 0.5 = 0.2 → x_pixel = 600
    const pattern = makePattern()
    const result = reconstructDotPositions([0, 200], pattern, 1000, 800, 2, 0.5)
    expect(result[1].x).toBeCloseTo(600, 0)
  })
})
