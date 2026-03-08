/**
 * Draw a procedural candle flame for Trataka pattern.
 * Technique: 44+ stacked horizontal ellipses with CONTINUOUS color
 * interpolation (no discrete bands). Each slice = one height level,
 * smooth color gradient from white core through yellow/orange to
 * red/transparent tip. Width varies by sinusoidal noise for organic
 * wobble without pixelation.
 *
 * Pure function — no React dependency.
 */

interface ColorStop { at: number; r: number; g: number; b: number; a: number }

const FLAME_STOPS: ColorStop[] = [
  { at: 0.0,  r: 255, g: 255, b: 240, a: 0.95 },
  { at: 0.12, r: 255, g: 250, b: 200, a: 0.92 },
  { at: 0.25, r: 255, g: 230, b: 120, a: 0.85 },
  { at: 0.40, r: 255, g: 200, b: 60,  a: 0.72 },
  { at: 0.55, r: 255, g: 160, b: 35,  a: 0.55 },
  { at: 0.70, r: 240, g: 115, b: 20,  a: 0.35 },
  { at: 0.85, r: 210, g: 75,  b: 15,  a: 0.15 },
  { at: 1.0,  r: 170, g: 45,  b: 10,  a: 0.01 },
]

function lerpColor(stops: ColorStop[], frac: number) {
  let lo = stops[0]
  let hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (frac >= stops[i].at && frac <= stops[i + 1].at) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  const t = (frac - lo.at) / (hi.at - lo.at || 1)
  return {
    r: Math.round(lo.r + (hi.r - lo.r) * t),
    g: Math.round(lo.g + (hi.g - lo.g) * t),
    b: Math.round(lo.b + (hi.b - lo.b) * t),
    a: lo.a + (hi.a - lo.a) * t,
  }
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
  const baseWidth = 22

  ctx.save()

  // ── Ambient glow (warm halo around the flame) ──
  const glowR = (90 * 0.8 + 25) * scale
  const glowAlpha = 0.10
  const ambientGlow = ctx.createRadialGradient(
    x, baseY - flameHeight * 0.35, 0,
    x, baseY - flameHeight * 0.35, glowR,
  )
  ambientGlow.addColorStop(0, `rgba(255,170,60,${glowAlpha})`)
  ambientGlow.addColorStop(0.5, `rgba(255,120,30,${glowAlpha * 0.35})`)
  ambientGlow.addColorStop(1, 'rgba(255,100,20,0)')
  ctx.fillStyle = ambientGlow
  ctx.beginPath()
  ctx.arc(x, baseY - flameHeight * 0.35, glowR, 0, Math.PI * 2)
  ctx.fill()

  // ── Flame body: stacked horizontal ellipses with continuous color ──
  const layerCount = 44
  for (let i = layerCount; i >= 0; i--) {
    const frac = i / layerCount // 0 = bottom (base), 1 = tip

    // Parabolic width profile: widest at base, tapers to tip
    const profile = 1 - frac * frac

    // Sinusoidal width wobble (organic, no pixel artifacts)
    const wobble = Math.sin(frac * 12 + time * 2.5) * 6 * frac

    const w = (profile * baseWidth + wobble) * scale
    const ly = baseY - frac * flameHeight

    // Dual-sine sway: stronger toward tip
    const sway = (
      Math.sin(time * 1.3 + frac * 2) * 0.65 +
      Math.sin(time * 1.3 * 1.6 + frac * 3.5) * 0.35
    ) * 3 * frac * scale

    // Continuous interpolated color
    const c = lerpColor(FLAME_STOPS, frac)

    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`
    ctx.beginPath()
    ctx.ellipse(x + sway, ly, Math.max(1, w), 8 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── Wick ──
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(x - 1.5 * scale, baseY, 3 * scale, 12 * scale)

  // ── Base glow (warm light pool under flame) ──
  const glow = ctx.createRadialGradient(x, baseY, 0, x, baseY, 60 * scale)
  glow.addColorStop(0, 'rgba(255,160,50,0.15)')
  glow.addColorStop(1, 'rgba(255,160,50,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, baseY, 60 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
