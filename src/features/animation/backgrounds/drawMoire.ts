/**
 * Moire Rings -- two sets of concentric circles slightly offset from
 * each other. The interference creates an illusion of motion and depth
 * without any real animation.
 *
 * One set drifts at ~1px per 5 seconds, making the pattern "breathe."
 * The moire fringes shift hypnotically even at this imperceptible speed.
 *
 * For EMDR Diagonal: the optical interference keeps attention softly
 * engaged without competing with the diagonal dot trajectory.
 */

const RING_COUNT = 30
const DRIFT_SPEED = 0.0002 // px per ms (~1px per 5s)

export function drawMoire(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallTime: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  const maxR = Math.max(cx, cy) * 1.3
  const spacing = maxR / RING_COUNT

  // Second set offset: drifts in a slow circle
  const driftR = 3 * scale
  const ox = Math.cos(wallTime * DRIFT_SPEED) * driftR
  const oy = Math.sin(wallTime * DRIFT_SPEED * 0.7) * driftR

  ctx.save()
  ctx.lineWidth = 0.7 * Math.max(scale, 0.5)

  // Set A: centered
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color1
  ctx.beginPath()
  for (let i = 1; i <= RING_COUNT; i++) {
    const r = spacing * i
    ctx.moveTo(cx + r, cy)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  ctx.stroke()

  // Set B: slightly offset, drifting
  ctx.globalAlpha = opacity * 0.8
  ctx.strokeStyle = color2
  ctx.beginPath()
  for (let i = 1; i <= RING_COUNT; i++) {
    const r = spacing * i
    ctx.moveTo(cx + ox + r, cy + oy)
    ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2)
  }
  ctx.stroke()

  ctx.restore()
}
