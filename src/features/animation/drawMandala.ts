/**
 * Draw a parametric mandala background.
 * Concentric rings of elliptical petals, slowly rotating.
 * Pure function — no React dependency.
 *
 * @param ringColor1 — color for even rings (0, 2, 4)
 * @param ringColor2 — color for odd rings (1, 3)
 */
export function drawMandala(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  opacity: number = 0.08,
  scale: number = 1,
  ringColor1: string = '#c4956a',
  ringColor2: string = '#e8a838',
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(time)
  ctx.globalAlpha = opacity

  for (let ring = 0; ring < 5; ring++) {
    const r = (30 + ring * 28) * scale
    const petals = 8 + ring * 4
    ctx.strokeStyle = ring % 2 === 0 ? ringColor1 : ringColor2
    ctx.lineWidth = 0.8 * Math.max(scale * 0.5, 0.5)

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      const cr = (10 + ring * 3) * scale

      ctx.beginPath()
      ctx.ellipse(px, py, cr, cr * 0.4, a, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(0, 0, r + 12 * scale, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
