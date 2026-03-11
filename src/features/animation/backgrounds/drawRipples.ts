/**
 * 10 concentric circles, each breathing with its own phase.
 * Grounding, somatic feel. Good for vertical/downward patterns.
 */
export function drawRipples(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallTime: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  const ringCount = 10
  const baseSpacing = 18 * scale
  const breathAmp = 3 * scale

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.lineWidth = 0.6 * Math.max(scale * 0.5, 0.5)

  for (let i = 0; i < ringCount; i++) {
    const breath = Math.sin(wallTime / 1000 * 0.8 + i * 0.6) * breathAmp
    const r = baseSpacing * (i + 1) + breath

    ctx.strokeStyle = i % 2 === 0 ? color1 : color2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
