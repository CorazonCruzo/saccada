/**
 * Chladni Patterns -- visualization of resonance on a vibrating plate.
 * Sand collects along nodal lines where the surface doesn't move.
 *
 * Formula: cos(n*pi*x/L)*cos(m*pi*y/L) - cos(m*pi*x/L)*cos(n*pi*y/L) = 0
 *
 * Different (n, m) pairs produce different symmetric figures.
 * The pattern slowly morphs between two parameter sets over time.
 *
 * Rendered into a small offscreen canvas and drawn upscaled with
 * bilinear smoothing so the lines look soft, not pixelated.
 *
 * Time-based (wallTime), not rotatable.
 */

const MORPH_SPEED = 0.00006
const SAMPLE_SIZE = 200 // offscreen resolution (square), upscaled smoothly

const MODES: Array<[number, number]> = [
  [2, 5], [3, 7], [4, 7], [5, 8], [3, 5], [6, 7], [2, 3], [5, 9],
]

function chladni(x: number, y: number, n: number, m: number): number {
  return Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y)
       - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
}

// Reuse offscreen canvas between frames
let offCanvas: HTMLCanvasElement | null = null
let offCtx: CanvasRenderingContext2D | null = null
let imgData: ImageData | null = null

function getOffscreen(sz: number): { oc: CanvasRenderingContext2D; img: ImageData; canvas: HTMLCanvasElement } | null {
  if (offCanvas && offCtx && imgData && imgData.width === sz) {
    return { oc: offCtx, img: imgData, canvas: offCanvas }
  }

  try {
    const c = document.createElement('canvas')
    c.width = sz
    c.height = sz
    const ctx2d = c.getContext('2d')
    if (!ctx2d) return null
    offCanvas = c
    offCtx = ctx2d
    imgData = ctx2d.createImageData(sz, sz)
    return { oc: offCtx, img: imgData, canvas: offCanvas }
  } catch {
    return null
  }
}

/** Parse "#rrggbb" to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function drawChladni(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallTime: number,
  opacity: number,
  _scale: number,
  color1: string,
  color2: string,
) {
  const w = cx * 2
  const h = cy * 2
  const sz = SAMPLE_SIZE

  const t = wallTime * MORPH_SPEED
  const idx = Math.floor(t) % MODES.length
  const nextIdx = (idx + 1) % MODES.length
  const blend = t - Math.floor(t)
  const s = blend * blend * (3 - 2 * blend)

  const [n1, m1] = MODES[idx]
  const [n2, m2] = MODES[nextIdx]

  const offscreen = getOffscreen(sz)

  ctx.save()

  if (offscreen) {
    // Smooth path: render to small ImageData, upscale with bilinear filtering
    const { oc, img, canvas } = offscreen
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)
    const data = img.data

    for (let iy = 0; iy < sz; iy++) {
      const ny = (iy / (sz - 1)) * 2 - 1
      for (let ix = 0; ix < sz; ix++) {
        const nx = (ix / (sz - 1)) * 2 - 1

        const v1 = chladni(nx, ny, n1, m1)
        const v2 = chladni(nx, ny, n2, m2)
        const v = v1 * (1 - s) + v2 * s

        const dist = Math.abs(v)
        const brightness = Math.exp(-dist * dist * 12)

        const off = (iy * sz + ix) * 4
        const rgb = brightness > 0.5 ? rgb1 : rgb2
        data[off] = rgb[0]
        data[off + 1] = rgb[1]
        data[off + 2] = rgb[2]
        data[off + 3] = (brightness * opacity * 0.8 * 255) | 0
      }
    }

    oc.putImageData(img, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const side = Math.max(w, h)
    const dx = (w - side) / 2
    const dy = (h - side) / 2
    ctx.drawImage(canvas, dx, dy, side, side)
  } else {
    // Fallback (test env): simple fillRect grid
    const step = 4
    const side = Math.min(w, h)
    for (let iy = 0; iy * step < h; iy++) {
      const py = iy * step
      const ny = (py - cy) / (side * 0.5)
      for (let ix = 0; ix * step < w; ix++) {
        const px = ix * step
        const nx = (px - cx) / (side * 0.5)
        const v = chladni(nx, ny, n1, m1) * (1 - s) + chladni(nx, ny, n2, m2) * s
        const brightness = Math.exp(-Math.abs(v) * Math.abs(v) * 12)
        if (brightness < 0.02) continue
        ctx.globalAlpha = opacity * brightness * 0.8
        ctx.fillStyle = color1
        ctx.fillRect(px, py, step, step)
      }
    }
  }

  ctx.restore()
}
