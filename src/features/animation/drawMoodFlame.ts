/**
 * Miniature mood flames for the mood check screen.
 * Technique: 40+ stacked horizontal ellipses with CONTINUOUS color
 * interpolation (no discrete bands). Each slice = one height level,
 * smooth color gradient from white core through yellow/orange to
 * red/transparent tip. Width varies by sinusoidal noise for organic
 * wobble without pixelation.
 *
 * Pure function — no React dependency.
 */

interface MoodFlameConfig {
  /** Sinusoidal width jitter (px). Calm ~1.5, restless ~8. */
  jitter: number
  /** Sway oscillation speed. */
  swaySpeed: number
  /** Sway horizontal extent (px). */
  swayAmplitude: number
  /** Total flame height (px before scale). */
  flameHeight: number
  /** Base half-width of widest part (px before scale). */
  baseWidth: number
  /** 0 = restless (red-heavy), 1 = calm (white-golden). */
  calmness: number
}

const CONFIGS: MoodFlameConfig[] = [
  // Level 1 — calm (small, gentle breathing)
  { jitter: 1.5, swaySpeed: 0.5,  swayAmplitude: 0.8, flameHeight: 32, baseWidth: 11, calmness: 1 },
  // Level 2 — steady
  { jitter: 2.5, swaySpeed: 0.8,  swayAmplitude: 1.5, flameHeight: 44, baseWidth: 13, calmness: 0.75 },
  // Level 3 — medium
  { jitter: 3.5, swaySpeed: 1.3,  swayAmplitude: 2.5, flameHeight: 56, baseWidth: 16, calmness: 0.5 },
  // Level 4 — nervous (chaos via fast sway, not shape deformation)
  { jitter: 4,   swaySpeed: 2.5,  swayAmplitude: 5,   flameHeight: 72, baseWidth: 19, calmness: 0.25 },
  // Level 5 — raging (chaos via fast sway + flicker, not silhouette pinching)
  { jitter: 4.5, swaySpeed: 4.0,  swayAmplitude: 7,   flameHeight: 90, baseWidth: 22, calmness: 0 },
]

// ── Color stops for continuous interpolation ──
// Each stop: [frac, r, g, b, alpha]
// Calmness shifts: calm = whiter/golden, restless = redder/darker tips
interface ColorStop { at: number; r: number; g: number; b: number; a: number }

function makeStops(calmness: number): ColorStop[] {
  return [
    { at: 0.0,  r: 255, g: 255, b: 225 + calmness * 25, a: 0.95 },
    { at: 0.12, r: 255, g: 250, b: 170 + calmness * 50, a: 0.92 },
    { at: 0.25, r: 255, g: 225 + calmness * 20, b: 90 + calmness * 50, a: 0.85 },
    { at: 0.40, r: 255, g: 190 + calmness * 30, b: 45 + calmness * 35, a: 0.72 },
    { at: 0.55, r: 255, g: 150 + calmness * 30, b: 25 + calmness * 25, a: 0.55 },
    { at: 0.70, r: 245 - calmness * 15, g: 105 + calmness * 35, b: 18 + calmness * 15, a: 0.35 },
    { at: 0.85, r: 220 - calmness * 25, g: 65 + calmness * 35, b: 12 + calmness * 10, a: 0.15 },
    { at: 1.0,  r: 180 - calmness * 30, g: 35 + calmness * 25, b: 8,  a: 0.01 },
  ]
}

function lerpColor(stops: ColorStop[], frac: number) {
  // Find bounding stops
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

export function drawMoodFlame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  level: number,
  scale: number = 1,
) {
  const config = CONFIGS[Math.max(0, Math.min(4, level - 1))]
  const { jitter, swaySpeed, swayAmplitude, flameHeight, baseWidth, calmness } = config
  const stops = makeStops(calmness)

  const fh = flameHeight * scale
  const baseY = y + 10 * scale

  ctx.save()

  // ── Ambient glow (large warm halo around the whole flame) ──
  const glowR = (flameHeight * 0.8 + 25) * scale
  const glowFlicker = calmness < 0.5
    ? Math.sin(time * swaySpeed * 2.3) * 6 * (1 - calmness) * scale
    : 0
  const glowAlpha = 0.09 + calmness * 0.04
    + (calmness < 0.5 ? Math.sin(time * swaySpeed * 3.7) * 0.03 * (1 - calmness) : 0)

  const ambientGlow = ctx.createRadialGradient(
    x, baseY - fh * 0.35, 0,
    x, baseY - fh * 0.35, glowR + glowFlicker,
  )
  ambientGlow.addColorStop(0, `rgba(255,170,60,${glowAlpha})`)
  ambientGlow.addColorStop(0.5, `rgba(255,120,30,${glowAlpha * 0.35})`)
  ambientGlow.addColorStop(1, 'rgba(255,100,20,0)')
  ctx.fillStyle = ambientGlow
  ctx.beginPath()
  ctx.arc(x, baseY - fh * 0.35, glowR + glowFlicker, 0, Math.PI * 2)
  ctx.fill()

  // ── Flame body: stacked horizontal ellipses with continuous color ──
  const layerCount = 44
  for (let i = layerCount; i >= 0; i--) {
    const frac = i / layerCount // 0 = bottom (base), 1 = tip

    // Parabolic width profile: widest at base, tapers to tip
    const profile = 1 - frac * frac

    // Sinusoidal width wobble — proportional to profile width so it never
    // creates pinch/gourd shapes on large flames. Chaos comes from sway speed.
    const wobble = Math.sin(frac * 12 + time * (1 + (1 - calmness) * 2.5)) * jitter * frac * profile

    const w = (profile * baseWidth + wobble) * scale
    const ly = baseY - frac * fh

    // Dual-sine sway: stronger toward tip
    const sway = (
      Math.sin(time * swaySpeed + frac * 2) * 0.65 +
      Math.sin(time * swaySpeed * 1.6 + frac * 3.5) * 0.35
    ) * swayAmplitude * frac * scale

    // Continuous interpolated color
    const c = lerpColor(stops, frac)

    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${c.a})`
    ctx.beginPath()
    // Thick vertical radius (8px * scale) for generous overlap between slices
    ctx.ellipse(x + sway, ly, Math.max(1, w), 8 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── Wick ──
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(x - 1.5 * scale, baseY, 3 * scale, 10 * scale)

  // ── Base glow (warm light pool under flame) ──
  const baseGlow = ctx.createRadialGradient(x, baseY, 0, x, baseY, 35 * scale)
  baseGlow.addColorStop(0, 'rgba(255,160,50,0.14)')
  baseGlow.addColorStop(1, 'rgba(255,160,50,0)')
  ctx.fillStyle = baseGlow
  ctx.beginPath()
  ctx.arc(x, baseY, 35 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
