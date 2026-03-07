export interface CalibrationPoint {
  x: number
  y: number
}

/** Generate 9 calibration points in a 3x3 grid with padding */
export function getCalibrationPoints(
  width: number,
  height: number,
  padding: number = 0.1,
): CalibrationPoint[] {
  const points: CalibrationPoint[] = []
  const px = width * padding
  const py = height * padding
  const innerW = width - 2 * px
  const innerH = height - 2 * py

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      points.push({
        x: px + (col / 2) * innerW,
        y: py + (row / 2) * innerH,
      })
    }
  }
  return points
}

/** Pick N random points from the calibration grid for validation */
export function getValidationPoints(
  width: number,
  height: number,
  count: number = 5,
): CalibrationPoint[] {
  // Use same grid as calibration so we validate at trained positions
  const all = getCalibrationPoints(width, height, 0.1)
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/** Compute average distance between predicted and actual points */
export function computeAccuracy(
  predictions: Array<{ predicted: CalibrationPoint; actual: CalibrationPoint }>,
): { avgError: number; maxError: number } {
  if (predictions.length === 0) return { avgError: Infinity, maxError: Infinity }

  let totalError = 0
  let maxError = 0

  for (const { predicted, actual } of predictions) {
    const dx = predicted.x - actual.x
    const dy = predicted.y - actual.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    totalError += dist
    maxError = Math.max(maxError, dist)
  }

  return {
    avgError: totalError / predictions.length,
    maxError,
  }
}
