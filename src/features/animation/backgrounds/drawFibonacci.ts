/**
 * Tight logarithmic spiral filling the viewport.
 *
 * Growth rate 0.1 gives ~10 dense turns. Center starts sub-pixel
 * (invisible tip), outer end extends beyond canvas (clipped).
 * Both ends invisible = looks infinite.
 *
 * Log spiral property: rotation = scaling, so spinning looks like
 * the spiral is continuously unfurling from the center.
 *
 * Rotation multiplied 6x (base angle is too slow for a single line).
 */
const ROTATION_FACTOR = 6
const GROWTH = 0.1

export function drawFibonacci(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  opacity: number,
  scale: number,
  color: string,
) {
  const a = 0.3 * scale
  const maxR = 350 * scale
  // theta where spiral exits viewport
  const thetaMax = Math.log(maxR / a) / GROWTH
  const steps = 600

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle * ROTATION_FACTOR)
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.lineWidth = 0.8 * Math.max(scale * 0.5, 0.5)
  ctx.beginPath()

  let started = false
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * thetaMax
    const r = a * Math.exp(GROWTH * theta)

    // Skip sub-pixel center (no visible tip)
    if (r < 0.5) continue

    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)

    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else {
      ctx.lineTo(x, y)
    }
  }

  ctx.stroke()
  ctx.restore()
}
