import { useRef, useEffect, useCallback } from 'react'
import type { PatternConfig, Phase } from '@/entities/pattern'
import { getTrajectoryPosition, toCanvasCoords, type Point } from '@/shared/lib/math'
import { binduColors } from '@/shared/config/palette'
import { drawBindu } from './drawBindu'
import { drawFlame } from './drawFlame'
import { drawMandala } from './drawMandala'
import { drawTrail } from './drawTrail'

const TRAIL_MAX_LENGTH = 40
const MANDALA_SPEED = 0.0003

interface AnimationState {
  running: boolean
  startTime: number
  elapsed: number
  pausedAt: number
  currentPhaseIndex: number
  trail: Point[]
  mandalaAngle: number
  /** Normalized dot X: -1 (left) to 1 (right). Used for audio pan. */
  dotXNormalized: number
}

interface AnimationRefs {
  pattern: PatternConfig
  speed: number
  visualScale: number
  onFrame: ((dotXNormalized: number) => void) | null
  state: AnimationState
}

export function useAnimationLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  pattern: PatternConfig,
  isPlaying: boolean,
  speed: number = 1,
  visualScale: number = 1,
  onFrame?: (dotXNormalized: number) => void,
) {
  const refs = useRef<AnimationRefs>({
    pattern,
    speed,
    visualScale,
    onFrame: onFrame ?? null,
    state: {
      running: false,
      startTime: 0,
      elapsed: 0,
      pausedAt: 0,
      currentPhaseIndex: 0,
      trail: [],
      mandalaAngle: 0,
      dotXNormalized: 0,
    },
  })
  const rafId = useRef(0)

  // Update refs without re-render
  refs.current.pattern = pattern
  refs.current.speed = speed
  refs.current.visualScale = visualScale
  refs.current.onFrame = onFrame ?? null

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { pattern: pat, speed: spd, visualScale: vs, state } = refs.current
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    const now = performance.now()
    if (!state.running) return

    const dt = now - state.startTime - state.pausedAt
    state.elapsed = dt

    // Determine current phase
    let phaseTimeAccum = 0
    let activePhase: Phase = pat.phases[0]
    let phaseElapsed = dt

    for (let i = 0; i < pat.phases.length; i++) {
      const phaseDur = pat.phases[i].duration / spd
      if (dt < phaseTimeAccum + phaseDur) {
        activePhase = pat.phases[i]
        state.currentPhaseIndex = i
        phaseElapsed = dt - phaseTimeAccum
        break
      }
      phaseTimeAccum += phaseDur
      // If we've gone past all phases, loop back
      if (i === pat.phases.length - 1) {
        const totalDur = pat.phases.reduce((sum, p) => sum + p.duration / spd, 0)
        const loopedDt = dt % totalDur
        // Recalculate with looped time
        let acc2 = 0
        for (let j = 0; j < pat.phases.length; j++) {
          const pd = pat.phases[j].duration / spd
          if (loopedDt < acc2 + pd) {
            activePhase = pat.phases[j]
            state.currentPhaseIndex = j
            phaseElapsed = loopedDt - acc2
            break
          }
          acc2 += pd
        }
      }
    }

    // Compute dot position (trajectory scales with visualScale)
    let dotPos: Point
    if (activePhase.type === 'movement' && pat.cycleDuration) {
      const cycleMs = pat.cycleDuration / spd
      const cycleT = (phaseElapsed % cycleMs) / cycleMs
      const normPos = getTrajectoryPosition(cycleT, pat.trajectory, pat.trajectoryParams)
      normPos.x *= vs
      normPos.y *= vs
      dotPos = toCanvasCoords(normPos, w, h)
    } else {
      // Fixation or eyes-closed: center
      dotPos = { x: w / 2, y: h / 2 }
    }

    // Expose normalized X for audio pan (-1..1)
    state.dotXNormalized = w > 0 ? (dotPos.x / w) * 2 - 1 : 0
    if (refs.current.onFrame) {
      refs.current.onFrame(state.dotXNormalized)
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

    // Update mandala rotation
    state.mandalaAngle += MANDALA_SPEED

    // === RENDER ===
    const color = binduColors[pat.binduColor]

    // 1. Clear
    ctx.clearRect(0, 0, w, h)

    // 2. Mandala background (scale relative to viewport, then user scale)
    // Brighter in small previews, subtler in fullscreen sessions
    const mandalaScale = Math.min(w, h) / 350 * vs
    const mandalaOpacity = h < 400 ? 0.25 : 0.15
    drawMandala(ctx, w / 2, h / 2, state.mandalaAngle, mandalaOpacity, mandalaScale)

    // 3. Trail (only for moving patterns)
    if (pat.trajectory !== 'fixation' && state.trail.length > 1) {
      drawTrail(ctx, state.trail, color, Math.min(w, h) / 700 * vs)
    }

    // 4. Bindu or Flame (scale relative to viewport)
    const viewScale = Math.min(w, h) / 700 * vs
    const isEyesClosed = activePhase.type === 'eyes-closed'
    const dimFactor = isEyesClosed ? 0.15 : (pat.id === 'nimilita' ? 0.3 : 1)

    if (pat.visual === 'flame') {
      if (!isEyesClosed) {
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
        state.startTime = performance.now() - state.elapsed
        state.trail = []
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
    state.elapsed = 0
    state.startTime = performance.now()
    state.currentPhaseIndex = 0
    state.trail = []
  }, [pattern.id])

  return {
    getCurrentPhaseIndex: () => refs.current.state.currentPhaseIndex,
    getElapsed: () => refs.current.state.elapsed,
  }
}
