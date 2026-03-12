import { useRef, useEffect, useCallback } from 'react'
import type { PatternConfig, Phase, BackgroundPatternId, BackgroundRotation } from '@/entities/pattern'
import { getTrajectoryPosition, toCanvasCoords, type Point } from '@/shared/lib/math'
import { binduColors } from '@/shared/config/palette'
import { drawBindu } from './drawBindu'
import { drawFlame } from './drawFlame'
import { drawTrail } from './drawTrail'
import { drawBackground } from './backgrounds'
import { readMandalaColors } from './mandalaColors'

const TRAIL_MAX_LENGTH = 40
const MANDALA_SPEED = 0.0003

export interface FrameInfo {
  /** Normalized dot X: -1 (left) to 1 (right). Used for audio pan. */
  dotXNormalized: number
  /** Normalized dot Y: -1 (top) to 1 (bottom). Used for pitch bend. */
  dotYNormalized: number
  /** Dot X in canvas pixels */
  dotX: number
  /** Dot Y in canvas pixels */
  dotY: number
  /** Canvas width in CSS pixels */
  canvasW: number
  /** Canvas height in CSS pixels */
  canvasH: number
  /** Current phase index in the pattern's phases array */
  phaseIndex: number
  /** Current phase type */
  phaseType: 'movement' | 'fixation' | 'eyes-closed'
}

interface AnimationState {
  running: boolean
  /** Accumulated animation time (advances at speed * multiplier rate). Used for dot cycle position. */
  animTime: number
  /** Wall-clock active time (pauses excluded). Used for phase boundaries and session timer sync. */
  realTime: number
  /** Wall-clock timestamp of last rendered frame */
  lastFrameTime: number
  currentPhaseIndex: number
  /** animTime snapshot at the start of the current phase (for cycle offset) */
  phaseStartAnimTime: number
  trail: Point[]
  mandalaAngle: number
  dotXNormalized: number
  /** Cached mandala ring colors read from CSS variables */
  mandalaRing1: string
  mandalaRing2: string
}

interface AnimationRefs {
  pattern: PatternConfig
  speed: number
  speedMultiplierRef: React.RefObject<number> | null
  visualScale: number
  backgroundPattern: BackgroundPatternId
  backgroundRotation: BackgroundRotation
  keepVisualDuringEyesClosed: boolean
  onFrame: ((info: FrameInfo) => void) | null
  state: AnimationState
}

export function useAnimationLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  pattern: PatternConfig,
  isPlaying: boolean,
  speed: number = 1,
  visualScale: number = 1,
  onFrame?: (info: FrameInfo) => void,
  speedMultiplierRef?: React.RefObject<number>,
  backgroundPattern: BackgroundPatternId = 'mandala',
  backgroundRotation: BackgroundRotation = 'cw',
  keepVisualDuringEyesClosed: boolean = false,
) {
  const refs = useRef<AnimationRefs>({
    pattern,
    speed,
    speedMultiplierRef: speedMultiplierRef ?? null,
    visualScale,
    backgroundPattern,
    backgroundRotation,
    keepVisualDuringEyesClosed: false,
    onFrame: onFrame ?? null,
    state: {
      running: false,
      animTime: 0,
      realTime: 0,
      lastFrameTime: 0,
      currentPhaseIndex: 0,
      phaseStartAnimTime: 0,
      trail: [],
      mandalaAngle: 0,
      dotXNormalized: 0,
      mandalaRing1: '#c4956a',
      mandalaRing2: '#e8a838',
    },
  })
  const rafId = useRef(0)

  // Update refs without re-render
  refs.current.pattern = pattern
  refs.current.speed = speed
  refs.current.speedMultiplierRef = speedMultiplierRef ?? null
  refs.current.visualScale = visualScale
  refs.current.backgroundPattern = backgroundPattern
  refs.current.backgroundRotation = backgroundRotation
  refs.current.keepVisualDuringEyesClosed = keepVisualDuringEyesClosed
  refs.current.onFrame = onFrame ?? null

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { pattern: pat, speed: spd, speedMultiplierRef: mulRef, visualScale: vsRaw, state } = refs.current
    // Patterns that benefit from a larger base scale for comfortable viewing
    const upscaled = new Set(['sleep_rem', 'trataka', 'alokita', 'sachi', 'pralokita', 'emdr_classic', 'emdr_diagonal', 'anuvritta'])
    const vs = upscaled.has(pat.id) ? vsRaw * 1.5 : vsRaw
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    const now = performance.now()
    if (!state.running) return

    // Two clocks:
    // - realTime: wall-clock active time (drives phase boundaries, syncs with session timer)
    // - animTime: speed-adjusted time (drives dot movement cycle within phases)
    const multiplier = mulRef?.current ?? 1
    const frameDelta = now - state.lastFrameTime
    state.lastFrameTime = now
    state.realTime += frameDelta
    state.animTime += frameDelta * spd * multiplier

    // Determine current phase using realTime (phase durations are wall-clock)
    const rt = state.realTime
    const prevPhaseIndex = state.currentPhaseIndex
    let phaseTimeAccum = 0
    let activePhase: Phase = pat.phases[0]

    for (let i = 0; i < pat.phases.length; i++) {
      const phaseDur = pat.phases[i].duration
      if (rt < phaseTimeAccum + phaseDur) {
        activePhase = pat.phases[i]
        state.currentPhaseIndex = i
        break
      }
      phaseTimeAccum += phaseDur
      // If we've gone past all phases, loop back
      if (i === pat.phases.length - 1) {
        const totalDur = pat.phases.reduce((sum, p) => sum + p.duration, 0)
        const loopedRt = rt % totalDur
        // Recalculate with looped time
        let acc2 = 0
        for (let j = 0; j < pat.phases.length; j++) {
          const pd = pat.phases[j].duration
          if (loopedRt < acc2 + pd) {
            activePhase = pat.phases[j]
            state.currentPhaseIndex = j
            break
          }
          acc2 += pd
        }
      }
    }

    // Snapshot animTime on phase transitions (for cycle offset)
    if (state.currentPhaseIndex !== prevPhaseIndex) {
      state.phaseStartAnimTime = state.animTime
    }

    // Compute dot position (trajectory scales with visualScale)
    // Cycle position uses speed-adjusted time within the current phase
    let dotPos: Point
    if (activePhase.type === 'movement' && pat.cycleDuration) {
      const animPhaseElapsed = state.animTime - state.phaseStartAnimTime
      const cycleMs = pat.cycleDuration
      const cycleT = (animPhaseElapsed % cycleMs) / cycleMs
      const normPos = getTrajectoryPosition(cycleT, pat.trajectory, pat.trajectoryParams)
      normPos.x *= vs
      normPos.y *= vs
      // Compensate for widescreen: vertical amplitude is physically smaller
      if (normPos.y !== 0 && w > h) {
        normPos.y *= Math.min(w / h, 1.5)
      }
      dotPos = toCanvasCoords(normPos, w, h)
    } else {
      // Fixation or eyes-closed: center
      dotPos = { x: w / 2, y: h / 2 }
    }

    // Expose normalized positions for audio (-1..1)
    state.dotXNormalized = w > 0 ? (dotPos.x / w) * 2 - 1 : 0
    const dotYNormalized = h > 0 ? (dotPos.y / h) * 2 - 1 : 0
    if (refs.current.onFrame) {
      refs.current.onFrame({
        dotXNormalized: state.dotXNormalized,
        dotYNormalized,
        dotX: dotPos.x,
        dotY: dotPos.y,
        canvasW: w,
        canvasH: h,
        phaseIndex: state.currentPhaseIndex,
        phaseType: activePhase.type,
      })
    }

    // Update trail
    if (activePhase.type === 'movement') {
      state.trail.push({ ...dotPos })
      if (state.trail.length > TRAIL_MAX_LENGTH) {
        state.trail.shift()
      }
    } else {
      // Clear trail during fixation
      if (state.trail.length > 0) {
        state.trail.shift()
      }
    }

    // Update background rotation
    const bgRot = refs.current.backgroundRotation
    if (bgRot !== 'none') {
      state.mandalaAngle += MANDALA_SPEED * (bgRot === 'ccw' ? -1 : 1)
    }

    // === RENDER ===
    const color = binduColors[pat.binduColor]
    const bgId = refs.current.backgroundPattern

    // 1. Clear
    ctx.clearRect(0, 0, w, h)

    // 2. Background (scale relative to viewport, then user scale)
    // Brighter in small previews, subtler in fullscreen sessions
    if (bgId !== 'zen') {
      const bgScale = Math.min(w, h) / 350 * vs
      const bgOpacity = h < 400 ? 0.25 : 0.15
      drawBackground(bgId, ctx, w / 2, h / 2, state.mandalaAngle, now, bgOpacity, bgScale, state.mandalaRing1, state.mandalaRing2, color)
    }

    // 3. Trail (only for moving patterns)
    if (pat.trajectory !== 'fixation' && state.trail.length > 1) {
      drawTrail(ctx, state.trail, color, Math.min(w, h) / 700 * vs)
    }

    // 4. Bindu or Flame (scale relative to viewport)
    const viewScale = Math.min(w, h) / 700 * vs
    const isEyesClosed = activePhase.type === 'eyes-closed'
    const keepVisual = refs.current.keepVisualDuringEyesClosed
    let dimFactor = 1
    if (isEyesClosed && !keepVisual) {
      dimFactor = 0.15
    } else if (isEyesClosed && keepVisual) {
      dimFactor = 0.5
    } else if (pat.id === 'nimilita') {
      // Fade from 0.5 to 0.1 over first 30s, then hold at 0.1
      const fadeProgress = Math.min(state.realTime / 30_000, 1)
      dimFactor = 0.5 - fadeProgress * 0.4
    } else if (pat.id === 'sama') {
      // Breathing pulsation: opacity oscillates 0.8..1.0, period 4s
      dimFactor = 0.9 + 0.1 * Math.sin(now / 1000 * Math.PI * 2 / 4)
    }

    if (pat.visual === 'flame') {
      if (!isEyesClosed || keepVisual) {
        drawFlame(ctx, dotPos.x, dotPos.y, now / 1000 * 0.06 * 60, viewScale)
      }
    } else {
      const pulsePhase = now / 1000 * 1.8
      drawBindu(ctx, dotPos.x, dotPos.y, color, pulsePhase, 16 * viewScale, dimFactor)
    }

    // Continue loop
    rafId.current = requestAnimationFrame(render)
  }, [canvasRef])

  // Start/stop based on isPlaying
  useEffect(() => {
    const state = refs.current.state

    if (isPlaying) {
      if (!state.running) {
        state.running = true
        state.lastFrameTime = performance.now()
        state.trail = []
        const [c1, c2] = readMandalaColors()
        state.mandalaRing1 = c1
        state.mandalaRing2 = c2
      }
      rafId.current = requestAnimationFrame(render)
    } else {
      state.running = false
      cancelAnimationFrame(rafId.current)
    }

    return () => {
      cancelAnimationFrame(rafId.current)
    }
  }, [isPlaying, render])

  // Reset when pattern changes
  useEffect(() => {
    const state = refs.current.state
    state.animTime = 0
    state.realTime = 0
    state.phaseStartAnimTime = 0
    state.lastFrameTime = performance.now()
    state.currentPhaseIndex = 0
    state.trail = []
  }, [pattern.id])

  // Read mandala colors from CSS vars on mount and when theme class changes
  useEffect(() => {
    const [c1, c2] = readMandalaColors()
    refs.current.state.mandalaRing1 = c1
    refs.current.state.mandalaRing2 = c2

    const observer = new MutationObserver(() => {
      const [nc1, nc2] = readMandalaColors()
      refs.current.state.mandalaRing1 = nc1
      refs.current.state.mandalaRing2 = nc2
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return {
    getCurrentPhaseIndex: () => refs.current.state.currentPhaseIndex,
    getElapsed: () => refs.current.state.realTime,
  }
}
