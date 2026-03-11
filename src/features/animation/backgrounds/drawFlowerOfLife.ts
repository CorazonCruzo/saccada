/**
 * Flower of Life: 19 equal circles in concentric rings.
 * Full version of Seed of Life. More ornate, temple-like.
 */
export function drawFlowerOfLife(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  const R = 36 * scale

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.globalAlpha = opacity
  ctx.lineWidth = 0.7 * Math.max(scale * 0.5, 0.5)

  // Collect all circle centers
  const centers: [number, number][] = [[0, 0]]

  // Ring 1: 6 circles at distance R
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    centers.push([Math.cos(a) * R, Math.sin(a) * R])
  }

  // Ring 2a: 6 circles at distance 2R
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    centers.push([Math.cos(a) * 2 * R, Math.sin(a) * 2 * R])
  }

  // Ring 2b: 6 circles at distance R*sqrt(3), offset 30deg
  const rSqrt3 = R * Math.sqrt(3)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    centers.push([Math.cos(a) * rSqrt3, Math.sin(a) * rSqrt3])
  }

  // Draw all 19 circles
  for (let i = 0; i < centers.length; i++) {
    ctx.strokeStyle = i % 2 === 0 ? color1 : color2
    ctx.beginPath()
    ctx.arc(centers[i][0], centers[i][1], R, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
