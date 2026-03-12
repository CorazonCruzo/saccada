import { useRef, useEffect, useCallback } from 'react'
import type { PatternConfig, BackgroundPatternId, BackgroundRotation } from '@/entities/pattern'
import { setupCanvas } from '@/shared/lib/canvas'
import { useAnimationLoop, type FrameInfo } from '@/features/animation'
import { type AudioEngine } from '@/features/audio'
import { createEdgeDetector } from '@/features/haptics'

interface SessionPlayerProps {
  pattern: PatternConfig
  isPlaying: boolean
  speed?: number
  /** Ref-based speed multiplier read every frame (bypasses React render cycle) */
  speedMultiplierRef?: React.RefObject<number>
  visualScale?: number
  backgroundPattern?: BackgroundPatternId
  backgroundRotation?: BackgroundRotation
  audioEngine?: AudioEngine | null
  soundEnabled?: boolean
  hapticEnabled?: boolean
  onDotMove?: (dotX: number, dotY: number, canvasW: number, canvasH: number, phaseIndex: number, phaseType: 'movement' | 'fixation' | 'eyes-closed') => void
  className?: string
}

export function SessionPlayer({
  pattern,
  isPlaying,
  speed = 1,
  speedMultiplierRef,
  visualScale = 1,
  backgroundPattern,
  backgroundRotation,
  audioEngine = null,
  soundEnabled = false,
  hapticEnabled = false,
  onDotMove,
  className,
}: SessionPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const edgeDetectorRef = useRef(createEdgeDetector())
  const onDotMoveRef = useRef(onDotMove)
  onDotMoveRef.current = onDotMove

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    setupCanvas(canvas, rect.width, rect.height)
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // Per-frame callback: audio pan/pitch sync + haptic edge detection + dot position forwarding
  const onFrame = useCallback((info: FrameInfo) => {
    if (audioEngine && soundEnabled) {
      audioEngine.setPan(info.dotXNormalized)
      audioEngine.setPitchBend(info.dotYNormalized)
    }
    if (hapticEnabled) {
      edgeDetectorRef.current(info.dotXNormalized)
    }
    onDotMoveRef.current?.(info.dotX, info.dotY, info.canvasW, info.canvasH, info.phaseIndex, info.phaseType)
  }, [audioEngine, soundEnabled, hapticEnabled])

  // Trataka without sound: keep flame visible during eyes-closed (no audio bell to signal)
  const keepVisualDuringEyesClosed = pattern.visual === 'flame' && !soundEnabled

  useAnimationLoop(canvasRef, pattern, isPlaying, speed, visualScale, onFrame, speedMultiplierRef, backgroundPattern, backgroundRotation, keepVisualDuringEyesClosed)

  // Tab visibility: pause/resume audio when tab is hidden/shown
  useEffect(() => {
    if (!audioEngine || !soundEnabled) return

    const handleVisibility = () => {
      if (document.hidden) {
        audioEngine.pause()
      } else if (isPlaying) {
        audioEngine.resume()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [audioEngine, soundEnabled, isPlaying])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', background: 'var(--saccada-bg-deep)' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
