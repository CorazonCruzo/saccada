import type { GazePoint } from '@/features/eye-tracking'

/**
 * Heatmap renderer. Pure functions, no React dependency.
 *
 * Layers (bottom to top):
 * 1. Background (bg-deep)
 * 2. Gaze density heatmap (teal -> turmeric -> saffron gradient)
 * 3. Dot trajectory (thin gold line)
 * 4. Focus Timeline bar (8px, teal / dim)
 */

const CELL_SIZE = 20
const BLUR_RADIUS = 3

// Palette (RGB)
const TEAL = { r: 46, g: 196, b: 182 }
const TURMERIC = { r: 232, g: 168, b: 56 }
const SAFFRON = { r: 255, g: 107, b: 53 }

const BG_DEEP = '#0e0a1a'
const TIMELINE_HEIGHT = 8
const FOCUS_THRESHOLD_FRACTION = 0.25

// ---- Density grid ----

export function buildDensityGrid(
  points: GazePoint[],
  width: number,
  height: number,
  cellSize: number = CELL_SIZE,
): { grid: Float32Array; cols: number; rows: number; max: number } {
  const cols = Math.ceil(width / cellSize)
  const rows = Math.ceil(height / cellSize)
  const grid = new Float32Array(cols * rows)

  for (const p of points) {
    const col = Math.floor(p.x / cellSize)
    const row = Math.floor(p.y / cellSize)
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      grid[row * cols + col]++
    }
  }

  let max = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > max) max = grid[i]
  }

  return { grid, cols, rows, max }
}

// ---- Box blur ----

export function blurGrid(
  grid: Float32Array,
  cols: number,
  rows: number,
  radius: number = BLUR_RADIUS,
): Float32Array {
  const result = new Float32Array(cols * rows)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0
      let count = 0
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            sum += grid[nr * cols + nc]
            count++
          }
        }
      }
      result[r * cols + c] = sum / count
    }
  }

  return result
}

// ---- Color interpolation ----

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/**
 * Map normalized intensity (0..1) to RGBA.
 *
 * 0..0.5:   teal with increasing opacity (0 -> 180)
 * 0.5..0.75: teal -> turmeric, opacity 180 -> 230
 * 0.75..1.0: turmeric -> saffron, opacity 230 -> 255
 */
export function getHeatmapColor(intensity: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, intensity))
  if (t < 0.01) return [0, 0, 0, 0]

  if (t < 0.5) {
    const f = t / 0.5
    return [TEAL.r, TEAL.g, TEAL.b, Math.round(f * 180)]
  }

  if (t < 0.75) {
    const f = (t - 0.5) / 0.25
    return [
      lerp(TEAL.r, TURMERIC.r, f),
      lerp(TEAL.g, TURMERIC.g, f),
      lerp(TEAL.b, TURMERIC.b, f),
      lerp(180, 230, f),
    ]
  }

  const f = (t - 0.75) / 0.25
  return [
    lerp(TURMERIC.r, SAFFRON.r, f),
    lerp(TURMERIC.g, SAFFRON.g, f),
    lerp(TURMERIC.b, SAFFRON.b, f),
    lerp(230, 255, f),
  ]
}

// ---- Gaze heatmap layer ----

export function drawGazeHeatmap(
  ctx: CanvasRenderingContext2D,
  points: GazePoint[],
  width: number,
  height: number,
): void {
  if (points.length === 0 || width === 0 || height === 0) return

  const { grid, cols, rows, max } = buildDensityGrid(points, width, height)
  if (max === 0) return

  // Two-pass blur for smoother result
  let blurred = blurGrid(grid, cols, rows)
  blurred = blurGrid(blurred, cols, rows)

  let blurredMax = 0
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > blurredMax) blurredMax = blurred[i]
  }
  if (blurredMax === 0) return

  // Render at grid resolution, then scale up for smooth interpolation
  const offCanvas = document.createElement('canvas')
  offCanvas.width = cols
  offCanvas.height = rows
  const offCtx = offCanvas.getContext('2d')
  if (!offCtx) return

  const imageData = offCtx.createImageData(cols, rows)
  const data = imageData.data

  for (let i = 0; i < blurred.length; i++) {
    const intensity = blurred[i] / blurredMax
    if (intensity < 0.01) continue
    const [r, g, b, a] = getHeatmapColor(intensity)
    const idx = i * 4
    data[idx] = r
    data[idx + 1] = g
    data[idx + 2] = b
    data[idx + 3] = a
  }

  offCtx.putImageData(imageData, 0, 0)

  // Bilinear interpolation when scaling up gives a smooth gradient
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(offCanvas, 0, 0, width, height)
}

// ---- Trajectory overlay ----

export function drawTrajectoryOverlay(
  ctx: CanvasRenderingContext2D,
  dotPositions: Array<{ x: number; y: number }>,
  color: string = '#c4956a',
): void {
  if (dotPositions.length < 2) return

  ctx.beginPath()
  ctx.moveTo(dotPositions[0].x, dotPositions[0].y)
  for (let i = 1; i < dotPositions.length; i++) {
    ctx.lineTo(dotPositions[i].x, dotPositions[i].y)
  }
  ctx.strokeStyle = '#f0e6d3'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.55
  ctx.setLineDash([6, 4])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
}

// ---- Focus timeline ----

/**
 * Compute per-segment focus ratio from gaze points with recorded dot positions.
 * Returns null for segments with no data.
 */
export function computeFocusSegments(
  gazePoints: GazePoint[],
  viewportDiagonal: number,
  segments: number = 40,
): Array<number | null> {
  if (gazePoints.length === 0) return new Array(segments).fill(null)

  const hasDotPos = gazePoints[0]?.dotX != null
  if (!hasDotPos) return new Array(segments).fill(null)

  const threshold = viewportDiagonal * FOCUS_THRESHOLD_FRACTION
  const minT = gazePoints[0].t
  const maxT = gazePoints[gazePoints.length - 1].t
  const duration = maxT - minT
  if (duration <= 0) return new Array(segments).fill(null)

  const segDuration = duration / segments
  const onTarget: number[] = new Array(segments).fill(0)
  const counts: number[] = new Array(segments).fill(0)

  for (const gaze of gazePoints) {
    if (gaze.dotX == null || gaze.dotY == null) continue
    const segIdx = Math.min(Math.floor((gaze.t - minT) / segDuration), segments - 1)
    const dist = Math.sqrt((gaze.x - gaze.dotX) ** 2 + (gaze.y - gaze.dotY) ** 2)
    counts[segIdx]++
    if (dist < threshold) onTarget[segIdx]++
  }

  return onTarget.map((on, i) => (counts[i] > 0 ? on / counts[i] : null))
}

export function drawFocusTimeline(
  ctx: CanvasRenderingContext2D,
  segments: Array<number | null>,
  width: number,
  height: number,
): void {
  if (segments.length === 0) return

  const y = height - TIMELINE_HEIGHT
  const segWidth = width / segments.length

  // Background strip
  ctx.fillStyle = '#1a1035'
  ctx.fillRect(0, y, width, TIMELINE_HEIGHT)

  for (let i = 0; i < segments.length; i++) {
    const ratio = segments[i]
    if (ratio === null) continue
    ctx.fillStyle = ratio >= 0.5 ? '#2ec4b6' : '#2d2255'
    ctx.fillRect(
      Math.floor(i * segWidth),
      y,
      Math.ceil(segWidth) + 1,
      TIMELINE_HEIGHT,
    )
  }
}

// ---- Composite ----

export interface HeatmapOptions {
  dotPositions?: Array<{ x: number; y: number }>
  focusSegments?: Array<number | null>
}

/**
 * Draw the complete heatmap visualization.
 * Layer order: background -> gaze heatmap -> dot trajectory -> focus timeline.
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  gazePoints: GazePoint[],
  width: number,
  height: number,
  options?: HeatmapOptions,
): void {
  ctx.fillStyle = BG_DEEP
  ctx.fillRect(0, 0, width, height)

  if (gazePoints.length === 0) return

  drawGazeHeatmap(ctx, gazePoints, width, height)

  if (options?.dotPositions && options.dotPositions.length > 1) {
    drawTrajectoryOverlay(ctx, options.dotPositions)
  }

  if (options?.focusSegments) {
    drawFocusTimeline(ctx, options.focusSegments, width, height)
  }
}
