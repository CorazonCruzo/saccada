import { useRef, useEffect, useCallback, useMemo } from 'react'
import type { GazePoint } from '@/features/eye-tracking'
import { drawHeatmap } from './drawHeatmap'

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

  // Infer source dimensions from point bounds if not provided
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

    // No DPR scaling: putImageData writes directly to the pixel buffer
    // and ignores canvas transforms. With 16px cells + blur, Retina
    // resolution adds no visible difference.
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Scale gaze points from source viewport to canvas dimensions
    const scaleX = w / source.w
    const scaleY = h / source.h
    const scaled = gazePoints.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
      t: p.t,
    }))

    drawHeatmap(ctx, scaled, w, h)
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
