import { hasWebGazerCalibrationData } from './hasCalibrationData'

/**
 * Determine if the user should go through calibration before a session.
 *
 * Calibration is needed when eye tracking is enabled AND either:
 *   - The user never calibrated (calibratedAt is null), OR
 *   - WebGazer's internal calibration data is missing from localStorage
 *     (e.g. storage was cleared, quota exceeded, different browser profile).
 */
export function shouldCalibrate(
  eyeTrackingEnabled: boolean,
  calibratedAt: number | null,
): boolean {
  if (!eyeTrackingEnabled) return false
  if (!calibratedAt) return true
  // calibratedAt exists, but WebGazer data might be gone
  return !hasWebGazerCalibrationData()
}
