/**
 * Penrose tiling (P3 rhombus variant) via Robinson triangle subdivision.
 *
 * Aperiodic mosaic of two rhombus types: thick (72/108) and thin (36/144).
 * Has 5-fold rotational symmetry but never repeats.
 *
 * Starts from a "sun" decagon of 10 acute Robinson triangles,
 * subdivides 6 times producing ~2300 half-rhombi (~3500 unique edges).
 * Computed once, cached as typed arrays for 60fps rendering.
 *
 * Thick rhombi are subtly filled to distinguish the two types.
 * All edges are stroked on top.
 *
 * For Anuvritta: the aperiodicity prevents the eye from locking
 * onto any repeating rhythm in the background during rapid saccades.
 */

const PHI = (1 + Math.sqrt(5)) / 2
const SUBDIVISIONS = 6

type V = [number, number]
interface Tri { t: 0 | 1; a: V; b: V; c: V }

function subdivide(tris: Tri[]): Tri[] {
  const out: Tri[] = []
  for (const { t, a, b, c } of tris) {
    if (t === 0) {
      // Acute (36-72-72) -> 1 acute + 1 obtuse
      const p: V = [a[0] + (b[0] - a[0]) / PHI, a[1] + (b[1] - a[1]) / PHI]
      out.push({ t: 0, a: c, b: p, c: b })
      out.push({ t: 1, a: p, b: c, c: a })
    } else {
      // Obtuse (108-36-36) -> 2 obtuse + 1 acute
      const q: V = [b[0] + (a[0] - b[0]) / PHI, b[1] + (a[1] - b[1]) / PHI]
      const r: V = [b[0] + (c[0] - b[0]) / PHI, b[1] + (c[1] - b[1]) / PHI]
      out.push({ t: 1, a: r, b: c, c: a })
      out.push({ t: 1, a: q, b: r, c: b })
      out.push({ t: 0, a: r, b: q, c: a })
    }
  }
  return out
}

interface TilingData {
  /** Deduplicated edges: [x1,y1,x2,y2, ...] in unit-radius coordinates */
  edges: Float32Array
  /** Thick rhombus half-triangles (type 1): [ax,ay,bx,by,cx,cy, ...] */
  thickFill: Float32Array
}

let cache: TilingData | null = null

function buildTiling(): TilingData {
  if (cache) return cache

  // Sun: 10 acute triangles forming a decagon
  let tris: Tri[] = []
  for (let i = 0; i < 10; i++) {
    const a1 = (2 * Math.PI * i) / 10 - Math.PI / 2
    const a2 = (2 * Math.PI * (i + 1)) / 10 - Math.PI / 2
    const bv: V = [Math.cos(a1), Math.sin(a1)]
    const cv: V = [Math.cos(a2), Math.sin(a2)]
    tris.push(
      i % 2 === 0
        ? { t: 0, a: [0, 0], b: bv, c: cv }
        : { t: 0, a: [0, 0], b: cv, c: bv },
    )
  }

  for (let s = 0; s < SUBDIVISIONS; s++) tris = subdivide(tris)

  // Collect thick fills and deduplicate edges
  const Q = 1000
  const seen = new Set<string>()
  const edgeBuf: number[] = []
  const thickBuf: number[] = []

  for (const { t, a, b, c } of tris) {
    addEdge(a, b, seen, edgeBuf, Q)
    addEdge(b, c, seen, edgeBuf, Q)
    addEdge(c, a, seen, edgeBuf, Q)
    if (t === 1) thickBuf.push(a[0], a[1], b[0], b[1], c[0], c[1])
  }

  cache = {
    edges: new Float32Array(edgeBuf),
    thickFill: new Float32Array(thickBuf),
  }
  return cache
}

function addEdge(p: V, q: V, seen: Set<string>, buf: number[], Q: number) {
  const x1 = Math.round(p[0] * Q)
  const y1 = Math.round(p[1] * Q)
  const x2 = Math.round(q[0] * Q)
  const y2 = Math.round(q[1] * Q)
  const key =
    x1 < x2 || (x1 === x2 && y1 < y2)
      ? `${x1},${y1},${x2},${y2}`
      : `${x2},${y2},${x1},${y1}`
  if (seen.has(key)) return
  seen.add(key)
  buf.push(p[0], p[1], q[0], q[1])
}

export function drawPenrose(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  const { edges, thickFill } = buildTiling()
  // Cover viewport including corners
  const r = Math.max(cx, cy) * 1.2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  // Fill thick rhombi (type 1 half-triangles)
  ctx.globalAlpha = opacity * 0.6
  ctx.fillStyle = color2
  ctx.beginPath()
  for (let i = 0; i < thickFill.length; i += 6) {
    ctx.moveTo(thickFill[i] * r, thickFill[i + 1] * r)
    ctx.lineTo(thickFill[i + 2] * r, thickFill[i + 3] * r)
    ctx.lineTo(thickFill[i + 4] * r, thickFill[i + 5] * r)
    ctx.closePath()
  }
  ctx.fill()

  // Stroke all edges
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color1
  ctx.lineWidth = Math.max(0.8 * scale, 0.5)
  ctx.beginPath()
  for (let i = 0; i < edges.length; i += 4) {
    ctx.moveTo(edges[i] * r, edges[i + 1] * r)
    ctx.lineTo(edges[i + 2] * r, edges[i + 3] * r)
  }
  ctx.stroke()

  ctx.restore()
}
