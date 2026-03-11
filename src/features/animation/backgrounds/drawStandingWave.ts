/**
 * Standing Wave -- horizontal sinusoids layered with different phases.
 * Nodes and antinodes pulse slowly, creating the feel of sound frozen
 * in space.
 *
 * For bilateral / rhythmic patterns: a visual rhyme to the audio pulsation.
 *
 * Uses wallTime (not angle) -- the wave breathes on its own, rotation
 * controls have no effect.
 */

const WAVE_COUNT = 8
const PHASE_SPEED = 0.0004 // radians per ms for slow breathing

export function drawStandingWave(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallTime: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  const w = cx * 2
  const h = cy * 2

  ctx.save()
  ctx.lineWidth = Math.max(0.8 * scale, 0.5)

  const step = 2 * scale // px between sample points
  const points = Math.ceil(w / step) + 1

  for (let i = 0; i < WAVE_COUNT; i++) {
    // Each wave has its own phase offset and vertical position
    const phaseOffset = (i * Math.PI * 2) / WAVE_COUNT
    const baseY = cy + (i - (WAVE_COUNT - 1) / 2) * (h / (WAVE_COUNT + 2))

    // Standing wave = sin(kx) * cos(wt + phase)
    // k controls spatial frequency, w controls pulsation speed
    const k = (Math.PI * (2 + i * 0.3)) / w // slightly different k per wave
    const envelope = Math.cos(wallTime * PHASE_SPEED + phaseOffset)
    const amplitude = (h / (WAVE_COUNT + 2)) * 0.4 * scale * envelope

    // Alternate colors between waves
    const isOdd = i % 2 === 1
    ctx.strokeStyle = isOdd ? color2 : color1
    ctx.globalAlpha = opacity * (0.5 + 0.3 * Math.abs(envelope))

    ctx.beginPath()
    for (let p = 0; p < points; p++) {
      const x = p * step
      const y = baseY + Math.sin(k * x) * amplitude
      if (p === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  ctx.restore()
}
