/**
 * Check if calibration data exists in localStorage.
 * The pipeline stores ridge regression weights under 'saccada-calibration-data'.
 */

const CALIBRATION_KEY = 'saccada-calibration-data'

export async function hasCalibrationData(): Promise<boolean> {
  try {
    const data = localStorage.getItem(CALIBRATION_KEY)
    return data !== null
  } catch {
    return false
  }
}