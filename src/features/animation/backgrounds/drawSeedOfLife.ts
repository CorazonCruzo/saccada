/**
 * Seed of Life: 7 equal circles (1 center + 6 surrounding).
 * Minimal sacred geometry. Slow rotation.
 * Good for fixation/meditation patterns.
 */
export function drawSeedOfLife(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  const R = 50 * scale

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.globalAlpha = opacity
  ctx.lineWidth = 0.8 * Math.max(scale * 0.5, 0.5)

  // Center circle
  ctx.strokeStyle = color1
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.stroke()

  // 6 surrounding circles at distance R
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ctx.strokeStyle = i % 2 === 0 ? color2 : color1
    ctx.beginPath()
    ctx.arc(Math.cos(a) * R, Math.sin(a) * R, R, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
