import type { Point } from '@/shared/lib/math'

/**
 * Draw a fading trail behind the moving bindu.
 * Pure function — no React dependency.
 */
export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Point[],
  color: string,
) {
  for (let i = 0; i < trail.length; i++) {
    const alpha = i / trail.length
    const hex = Math.round(alpha * 40).toString(16).padStart(2, '0')
    ctx.fillStyle = color + hex
    ctx.beginPath()
    ctx.arc(trail[i].x, trail[i].y, 2 + alpha * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}
