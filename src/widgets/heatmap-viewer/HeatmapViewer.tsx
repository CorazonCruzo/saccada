import { useRef, useEffect, useCallback, useMemo } from 'react'
import type { GazePoint } from '@/features/eye-tracking'
import { drawHeatmap, computeFocusSegments } from './drawHeatmap'

interface HeatmapViewerProps {
  gazePoints: GazePoint[]
  /** Original viewport width during session (for coordinate scaling) */
  sourceWidth?: number
  /** Original viewport height during session (for coordinate scaling) */
  sourceHeight?: number
  className?: string
}

export function HeatmapViewer({ gazePoints, sourceWidth, sourceHeight, className }: HeatmapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const source = useMemo(() => {
    if (sourceWidth && sourceHeight) return { w: sourceWidth, h: sourceHeight }
    let maxX = 0
    let maxY = 0
    for (const p of gazePoints) {
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    return { w: maxX || 1, h: maxY || 1 }
  }, [gazePoints, sourceWidth, sourceHeight])

  const renderHeatmap = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    if (w === 0 || h === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)

    // Scale gaze points from source viewport to canvas dimensions
    const scaleX = w / source.w
    const scaleY = h / source.h
    const scaled: GazePoint[] = gazePoints.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
      t: p.t,
      dotX: p.dotX != null ? p.dotX * scaleX : undefined,
      dotY: p.dotY != null ? p.dotY * scaleY : undefined,
    }))

    // Extract & scale dot trajectory (sample to avoid too many line segments)
    let dotPositions: Array<{ x: number; y: number }> | undefined
    if (scaled.length > 0 && scaled[0].dotX != null) {
      const step = Math.max(1, Math.floor(scaled.length / 500))
      const positions: Array<{ x: number; y: number }> = []
      for (let i = 0; i < scaled.length; i += step) {
        const p = scaled[i]
        if (p.dotX != null && p.dotY != null) {
          positions.push({ x: p.dotX, y: p.dotY })
        }
      }
      if (positions.length > 1) dotPositions = positions
    }

    // Focus timeline
    const diagonal = Math.sqrt(w ** 2 + h ** 2)
    const focusSegs = computeFocusSegments(scaled, diagonal)
    const hasTimeline = focusSegs.some((s) => s !== null)

    drawHeatmap(ctx, scaled, w, h, {
      dotPositions,
      focusSegments: hasTimeline ? focusSegs : undefined,
    })
  }, [gazePoints, source])

  useEffect(() => {
    renderHeatmap()
  }, [renderHeatmap])

  useEffect(() => {
    window.addEventListener('resize', renderHeatmap)
    return () => window.removeEventListener('resize', renderHeatmap)
  }, [renderHeatmap])

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
