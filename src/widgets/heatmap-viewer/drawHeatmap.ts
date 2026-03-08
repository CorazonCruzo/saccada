import type { GazePoint } from '@/features/eye-tracking'

/**
 * Heatmap renderer. Pure function, no React dependency.
 *
 * Algorithm:
 * 1. Divide canvas into grid cells
 * 2. Count gaze points per cell
 * 3. Apply gaussian blur
 * 4. Map density to color gradient (indigo -> teal -> turmeric -> saffron)
 */

const CELL_SIZE = 16
const BLUR_RADIUS = 2 // cells

// Heatmap palette: from bg-deep through cool to warm
const HEATMAP_COLORS = [
  [14, 10, 26, 0],      // bg-deep, transparent
  [108, 92, 231, 80],   // indigo
  [46, 196, 182, 140],  // teal
  [232, 168, 56, 200],  // turmeric
  [255, 107, 53, 255],  // saffron
] as const

/**
 * Build a density grid from gaze points.
 */
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

/**
 * Apply a simple box blur (approximation of gaussian) to the density grid.
 */
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

/**
 * Interpolate between heatmap color stops based on normalized value (0..1).
 */
export function getHeatmapColor(t: number): [number, number, number, number] {
  const stops = HEATMAP_COLORS
  const clampedT = Math.max(0, Math.min(1, t))
  const segment = clampedT * (stops.length - 1)
  const i = Math.floor(segment)
  const f = segment - i

  if (i >= stops.length - 1) {
    return [...stops[stops.length - 1]] as [number, number, number, number]
  }

  const a = stops[i]
  const b = stops[i + 1]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    Math.round(a[3] + (b[3] - a[3]) * f),
  ]
}

/**
 * Draw the heatmap onto a canvas context.
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  points: GazePoint[],
  width: number,
  height: number,
): void {
  if (points.length === 0 || width === 0 || height === 0) return

  const { grid, cols, rows, max } = buildDensityGrid(points, width, height)
  if (max === 0) return

  const blurred = blurGrid(grid, cols, rows)

  // Find blurred max
  let blurredMax = 0
  for (let i = 0; i < blurred.length; i++) {
    if (blurred[i] > blurredMax) blurredMax = blurred[i]
  }
  if (blurredMax === 0) return

  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const density = blurred[r * cols + c] / blurredMax
      if (density < 0.01) continue

      const color = getHeatmapColor(density)

      // Fill the cell's pixels
      const startX = c * CELL_SIZE
      const startY = r * CELL_SIZE
      const endX = Math.min(startX + CELL_SIZE, width)
      const endY = Math.min(startY + CELL_SIZE, height)

      for (let py = startY; py < endY; py++) {
        for (let px = startX; px < endX; px++) {
          const idx = (py * width + px) * 4
          data[idx] = color[0]
          data[idx + 1] = color[1]
          data[idx + 2] = color[2]
          data[idx + 3] = color[3]
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Draw the dot trajectory path as a thin gold line.
 */
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
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.4
  ctx.stroke()
  ctx.globalAlpha = 1
}
