import { useRef, useEffect, useCallback } from 'react'
import type { PatternConfig } from '@/entities/pattern'
import { setupCanvas } from '@/shared/lib/canvas'
import { useAnimationLoop } from '@/features/animation'

interface SessionPlayerProps {
  pattern: PatternConfig
  isPlaying: boolean
  speed?: number
  className?: string
}

export function SessionPlayer({ pattern, isPlaying, speed = 1, className }: SessionPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  useAnimationLoop(canvasRef, pattern, isPlaying, speed)

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
