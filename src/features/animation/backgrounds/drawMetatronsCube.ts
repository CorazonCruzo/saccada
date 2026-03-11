/**
 * Metatron's Cube: 13 circles + lines connecting all centers.
 * Contains all Platonic solids. Most complex visually.
 * At low opacity appears as a fine geometric web.
 */
export function drawMetatronsCube(
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

  // 13 circle centers: 1 center + 6 inner + 6 outer
  const centers: [number, number][] = [[0, 0]]

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    centers.push([Math.cos(a) * R, Math.sin(a) * R])
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    centers.push([Math.cos(a) * 2 * R, Math.sin(a) * 2 * R])
  }

  // Draw connecting lines between all 13 centers (78 lines)
  ctx.strokeStyle = color2
  ctx.lineWidth = 0.4 * Math.max(scale * 0.5, 0.5)
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      ctx.beginPath()
      ctx.moveTo(centers[i][0], centers[i][1])
      ctx.lineTo(centers[j][0], centers[j][1])
      ctx.stroke()
    }
  }

  // Draw circles at each center
  const circleR = R * 0.4
  ctx.lineWidth = 0.8 * Math.max(scale * 0.5, 0.5)
  for (let i = 0; i < centers.length; i++) {
    ctx.strokeStyle = i % 2 === 0 ? color1 : color2
    ctx.beginPath()
    ctx.arc(centers[i][0], centers[i][1], circleR, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
