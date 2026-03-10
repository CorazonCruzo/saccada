import { getCalibrationPoints, type CalibrationPoint } from './calibration'

export interface CameraPreviewLayout {
  /** Left position in px */
  x: number
  /** Top position in px */
  y: number
  /** Width in px */
  width: number
  /** Height in px */
  height: number
}

/** Minimum viewport dimensions for calibration to work */
export const MIN_CALIBRATION_WIDTH = 768
export const MIN_CALIBRATION_HEIGHT = 500

const PREVIEW_ASPECT = 4 / 3
const MIN_PREVIEW_W = 160
/** Minimum px gap between preview edge and any calibration point */
export const POINT_MARGIN = 30

/** Whether the viewport is large enough for calibration */
export function isCalibrationViewportSupported(width: number, height: number): boolean {
  return width >= MIN_CALIBRATION_WIDTH && height >= MIN_CALIBRATION_HEIGHT
}

/**
 * Check if a rectangle (expanded by margin) contains any calibration point.
 */
export function overlapsAnyPoint(
  rect: { x: number; y: number; width: number; height: number },
  points: CalibrationPoint[],
  margin: number,
): boolean {
  for (const p of points) {
    if (
      p.x >= rect.x - margin &&
      p.x <= rect.x + rect.width + margin &&
      p.y >= rect.y - margin &&
      p.y <= rect.y + rect.height + margin
    ) {
      return true
    }
  }
  return false
}

/**
 * Compute safe camera preview position that doesn't overlap any calibration point.
 *
 * Strategy: calibration grid is 3x3 with 10% padding. The preview fills the
 * maximum available space in the bottom-right cell (between center and
 * bottom-right grid points), maintaining 4:3 aspect ratio.
 *
 * Grid layout (indices):
 *   0  1  2
 *   3  4  5
 *   6  7  8
 *
 * Bottom-right cell is bounded by points 4, 5, 7, 8.
 *
 * Returns null if viewport is too small or preview can't fit without overlap.
 */
export function computeCameraPreviewLayout(
  viewportWidth: number,
  viewportHeight: number,
): CameraPreviewLayout | null {
  if (!isCalibrationViewportSupported(viewportWidth, viewportHeight)) {
    return null
  }

  const points = getCalibrationPoints(viewportWidth, viewportHeight)

  // Bottom-right cell boundaries (with margin from bounding grid points)
  const cellLeft = points[4].x + POINT_MARGIN
  const cellRight = points[8].x - POINT_MARGIN
  const cellTop = points[4].y + POINT_MARGIN
  const cellBottom = points[8].y - POINT_MARGIN

  const availW = cellRight - cellLeft
  const availH = cellBottom - cellTop

  if (availW < MIN_PREVIEW_W || availH < MIN_PREVIEW_W / PREVIEW_ASPECT) {
    return null
  }

  // Maximize preview size while maintaining 4:3 aspect ratio
  let previewW: number
  let previewH: number

  if (availW / availH > PREVIEW_ASPECT) {
    // Height-constrained: fill available height
    previewH = Math.floor(availH)
    previewW = Math.floor(previewH * PREVIEW_ASPECT)
  } else {
    // Width-constrained: fill available width
    previewW = Math.floor(availW)
    previewH = Math.floor(previewW / PREVIEW_ASPECT)
  }

  // Center in available space
  const x = Math.round(cellLeft + (availW - previewW) / 2)
  const y = Math.round(cellTop + (availH - previewH) / 2)

  const layout: CameraPreviewLayout = { x, y, width: previewW, height: previewH }

  // Safety check: verify no overlap with any calibration point
  if (overlapsAnyPoint(layout, points, POINT_MARGIN)) {
    return null
  }

  return layout
}
