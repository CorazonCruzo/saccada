/**
 * Perlin Flow Field -- an invisible grid where 2D Perlin noise sets the
 * direction at every point. Hundreds of thin lines "flow" along the field,
 * creating a misty, breathing texture resembling wind, water currents,
 * or magnetic field lines.
 *
 * Time-based (wallTime), not rotatable. The noise field shifts slowly,
 * making the whole texture evolve organically.
 *
 * For REM Sleep: dreamlike, meditative, non-distracting.
 */

// ── Perlin noise (classic 2D, inlined) ──

const PERM = new Uint8Array(512)
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
]

// Seed the permutation table once
;(() => {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  // Fisher-Yates with fixed seed for determinism
  let seed = 42
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647
    const j = seed % (i + 1)
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]
})()

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y
}

function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const u = fade(xf)
  const v = fade(yf)

  const g00 = GRAD[PERM[PERM[xi] + yi] & 7]
  const g10 = GRAD[PERM[PERM[xi + 1] + yi] & 7]
  const g01 = GRAD[PERM[PERM[xi] + yi + 1] & 7]
  const g11 = GRAD[PERM[PERM[xi + 1] + yi + 1] & 7]

  const n00 = dot2(g00, xf, yf)
  const n10 = dot2(g10, xf - 1, yf)
  const n01 = dot2(g01, xf, yf - 1)
  const n11 = dot2(g11, xf - 1, yf - 1)

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v)
}

// ── Flow field ──

// Two layers: a dense fine mist + sparser longer wisps
const MIST_COUNT = 500 // fine short strokes — the fog body
const MIST_STEPS = 15
const MIST_STEP_SIZE = 2

const WISP_COUNT = 120 // longer flowing lines — visible currents
const WISP_STEPS = 50
const WISP_STEP_SIZE = 3

const NOISE_SCALE = 0.005 // spatial frequency of the noise
const TIME_SCALE = 0.000025 // how fast the field evolves

// Pre-generate deterministic starting positions
function generatePositions(count: number, seed: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let s = seed
  for (let i = 0; i < count; i++) {
    s = (s * 16807) % 2147483647
    const sx = (s % 10000) / 10000
    s = (s * 16807) % 2147483647
    const sy = (s % 10000) / 10000
    out.push([sx, sy])
  }
  return out
}

const mistStarts = generatePositions(MIST_COUNT, 137)
const wispStarts = generatePositions(WISP_COUNT, 991)

export function drawPerlinFlow(
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
  const t = wallTime * TIME_SCALE

  ctx.save()
  ctx.lineCap = 'round'

  // Layer 1: dense mist — many short strokes, very transparent, thicker line
  ctx.lineWidth = Math.max(2.5 * scale, 1.2)

  for (let i = 0; i < MIST_COUNT; i++) {
    ctx.strokeStyle = i % 3 === 0 ? color2 : color1
    ctx.globalAlpha = opacity * (0.04 + 0.03 * ((i % 7) / 6))

    let x = mistStarts[i][0] * w
    let y = mistStarts[i][1] * h

    ctx.beginPath()
    ctx.moveTo(x, y)

    const stepPx = MIST_STEP_SIZE * scale
    for (let s = 0; s < MIST_STEPS; s++) {
      const angle = noise2d(x * NOISE_SCALE, y * NOISE_SCALE + t) * Math.PI * 2
      x += Math.cos(angle) * stepPx
      y += Math.sin(angle) * stepPx
      ctx.lineTo(x, y)
    }

    ctx.stroke()
  }

  // Layer 2: wisps — longer, thinner, slightly more visible
  ctx.lineWidth = Math.max(0.7 * scale, 0.4)

  for (let i = 0; i < WISP_COUNT; i++) {
    ctx.strokeStyle = i % 2 === 0 ? color1 : color2
    ctx.globalAlpha = opacity * (0.08 + 0.05 * ((i % 5) / 4))

    let x = wispStarts[i][0] * w
    let y = wispStarts[i][1] * h

    ctx.beginPath()
    ctx.moveTo(x, y)

    const stepPx = WISP_STEP_SIZE * scale
    for (let s = 0; s < WISP_STEPS; s++) {
      const angle = noise2d(x * NOISE_SCALE, y * NOISE_SCALE + t) * Math.PI * 2
      x += Math.cos(angle) * stepPx
      y += Math.sin(angle) * stepPx
      ctx.lineTo(x, y)
    }

    ctx.stroke()
  }

  ctx.restore()
}
