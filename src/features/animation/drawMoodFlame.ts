/**
 * Miniature mood-indicator flames for the mood check screen.
 * Level 1 (anxious) = chaotic, tall, red-orange.
 * Level 5 (calm) = short, steady, white-golden.
 * Pure function — no React dependency.
 */

interface MoodFlameConfig {
  flickerAmplitude: number
  swaySpeed: number
  swayAmplitude: number
  flameHeight: number
  /** 0 = anxious (red-heavy), 1 = calm (white-yellow) */
  calmness: number
}

const CONFIGS: MoodFlameConfig[] = [
  // Level 1 — calm, nearly still (small)
  { flickerAmplitude: 1, swaySpeed: 0.3, swayAmplitude: 0.4, flameHeight: 36, calmness: 1 },
  // Level 2 — steady
  { flickerAmplitude: 3, swaySpeed: 0.7, swayAmplitude: 1.2, flameHeight: 42, calmness: 0.75 },
  // Level 3 — medium
  { flickerAmplitude: 6, swaySpeed: 1.3, swayAmplitude: 2.5, flameHeight: 48, calmness: 0.5 },
  // Level 4 — nervous
  { flickerAmplitude: 10, swaySpeed: 2.4, swayAmplitude: 4, flameHeight: 58, calmness: 0.25 },
  // Level 5 — raging, chaotic (tall)
  { flickerAmplitude: 14, swaySpeed: 3.5, swayAmplitude: 5.5, flameHeight: 68, calmness: 0 },
]

function noise(x: number, y: number, s: number): number {
  return Math.sin(x * s + y * 0.7) * Math.cos(y * s - x * 0.3) * 0.5 + 0.5
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
  const { flickerAmplitude, swaySpeed, swayAmplitude, flameHeight, calmness } = config

  const fh = flameHeight * scale
  const baseY = y + 10 * scale

  ctx.save()

  const layerCount = 35
  for (let i = layerCount; i >= 0; i--) {
    const frac = i / layerCount
    const timeScale = 1 + (1 - calmness) * 2
    const flicker = noise(time * timeScale, frac * 5, 2) * flickerAmplitude
    const w = ((1 - frac * frac) * 16 + flicker) * scale
    const h = frac * fh
    const ly = baseY - h
    const sway = Math.sin(time * swaySpeed + frac * 2) * swayAmplitude * frac * scale

    let r: number, g: number, b: number, a: number
    if (frac < 0.15) {
      // Core: whiter when calm
      r = 255
      g = 255
      b = 200 + calmness * 40
      a = 0.95
    } else if (frac < 0.4) {
      // Mid: golden-yellow when calm, orange when anxious
      r = 255
      g = 170 + calmness * 60
      b = 20 + calmness * 50
      a = 0.85
    } else if (frac < 0.7) {
      // Outer: orange when anxious, warm yellow when calm
      r = 255 - calmness * 30
      g = 90 + calmness * 60
      b = 10 + calmness * 30
      a = 0.55
    } else {
      // Tip: deep red when anxious, golden when calm
      r = 200 - calmness * 40
      g = 40 + calmness * 60
      b = 10 + calmness * 20
      a = 0.2
    }

    ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
    ctx.beginPath()
    ctx.ellipse(x + sway, ly, Math.max(1, w), 6 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Wick
  ctx.fillStyle = '#2a1a0a'
  ctx.fillRect(x - 1 * scale, baseY, 2 * scale, 8 * scale)

  // Base glow
  const glowRadius = 30 * scale
  const glow = ctx.createRadialGradient(x, baseY, 0, x, baseY, glowRadius)
  glow.addColorStop(0, `rgba(255,160,50,${0.1 + calmness * 0.06})`)
  glow.addColorStop(1, 'rgba(255,160,50,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, baseY, glowRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
