/**
 * Draw a procedural candle flame for Trataka pattern.
 * 40+ stacked elliptical layers with noise-based width variation.
 * Pure function — no React dependency.
 */
function noise(x: number, y: number, s: number): number {
  return Math.sin(x * s + y * 0.7) * Math.cos(y * s - x * 0.3) * 0.5 + 0.5
}

export function drawFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  scale: number = 1,
) {
  const flameHeight = 90 * scale
  const baseY = y + 20 * scale

  ctx.save()

  // Flame layers (back to front)
  for (let i = 40; i >= 0; i--) {
    const frac = i / 40
    const flicker = noise(time, frac * 5, 2) * 6
    const w = ((1 - frac * frac) * 22 + flicker) * scale
    const h = frac * flameHeight
    const ly = baseY - h
    const sway = Math.sin(time * 1.3 + frac * 2) * 3 * frac * scale

    let r: number, g: number, b: number, a: number
    if (frac < 0.15) {
      r = 255; g = 255; b = 220; a = 0.95
    } else if (frac < 0.4) {
      r = 255; g = 200; b = 50; a = 0.85
    } else if (frac < 0.7) {
      r = 255; g = 120; b = 20; a = 0.6
    } else {
      r = 200; g = 60; b = 20; a = 0.2
    }

    ctx.fillStyle = `rgba(${r},${g},${b},${a})`
    ctx.beginPath()
    ctx.ellipse(x + sway, ly, w, 8 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Wick
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(x - 1.5 * scale, baseY, 3 * scale, 12 * scale)

  // Base glow
  const glow = ctx.createRadialGradient(x, baseY, 0, x, baseY, 60 * scale)
  glow.addColorStop(0, 'rgba(255,160,50,0.15)')
  glow.addColorStop(1, 'rgba(255,160,50,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, baseY, 60 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
