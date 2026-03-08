import { useRef, useEffect, useCallback } from 'react'
import type { PatternConfig } from '@/entities/pattern'
import { setupCanvas } from '@/shared/lib/canvas'
import { useAnimationLoop, type FrameInfo } from '@/features/animation'
import { type AudioEngine } from '@/features/audio'
import { createEdgeDetector } from '@/features/haptics'

interface SessionPlayerProps {
  pattern: PatternConfig
  isPlaying: boolean
  speed?: number
  visualScale?: number
  audioEngine?: AudioEngine | null
  soundEnabled?: boolean
  hapticEnabled?: boolean
  onDotMove?: (dotX: number, dotY: number, canvasW: number, canvasH: number) => void
  className?: string
}

export function SessionPlayer({
  pattern,
  isPlaying,
  speed = 1,
  visualScale = 1,
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

  // Per-frame callback: audio pan sync + haptic edge detection + dot position forwarding
  const onFrame = useCallback((info: FrameInfo) => {
    if (audioEngine && soundEnabled) {
      audioEngine.setPan(info.dotXNormalized)
    }
    if (hapticEnabled) {
      edgeDetectorRef.current(info.dotXNormalized)
    }
    onDotMoveRef.current?.(info.dotX, info.dotY, info.canvasW, info.canvasH)
  }, [audioEngine, soundEnabled, hapticEnabled])

  useAnimationLoop(canvasRef, pattern, isPlaying, speed, visualScale, onFrame)

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
      style={{ width: '100%', height: '100%', background: '#0e0a1a' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
