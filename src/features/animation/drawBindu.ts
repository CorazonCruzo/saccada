/**
 * Draw a bindu (sacred dot) with three concentric glow layers.
 * Pure function — no React dependency.
 */
export function drawBindu(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  pulsePhase: number,
  baseRadius: number = 16,
  dimFactor: number = 1,
) {
  const pulse = 1 + Math.sin(pulsePhase) * 0.12
  const r = baseRadius * pulse

  ctx.save()
  ctx.globalAlpha = dimFactor

  // Outer glow (18% opacity, radius 3R)
  const g3 = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
  g3.addColorStop(0, color + '30')
  g3.addColorStop(1, color + '00')
  ctx.fillStyle = g3
  ctx.beginPath()
  ctx.arc(x, y, r * 3, 0, Math.PI * 2)
  ctx.fill()

  // Mid glow (50% opacity, radius 1.8R)
  const g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8)
  g2.addColorStop(0, color + '80')
  g2.addColorStop(1, color + '00')
  ctx.fillStyle = g2
  ctx.beginPath()
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2)
  ctx.fill()

  // Core (white center fading to color)
  const g1 = ctx.createRadialGradient(x, y, 0, x, y, r)
  g1.addColorStop(0, '#ffffffdd')
  g1.addColorStop(0.3, color)
  g1.addColorStop(1, color + '00')
  ctx.fillStyle = g1
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
