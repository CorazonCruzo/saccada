/**
 * Radial gradient pulsating from center.
 * Uses the pattern's bindu color, heavily muted.
 * Opacity pulses 50%→100%→50% over 8 seconds.
 */
export function drawAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallTime: number,
  opacity: number,
  scale: number,
  color: string,
) {
  const r = 180 * scale
  // 8-second breathing cycle
  const pulse = 0.5 + 0.5 * Math.sin(wallTime / 1000 * Math.PI / 4)

  ctx.save()
  ctx.globalAlpha = opacity * pulse

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0, color)
  grad.addColorStop(1, 'transparent')

  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
