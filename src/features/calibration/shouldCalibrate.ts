import { hasCalibrationData } from './hasCalibrationData'

/**
 * Determine if the user should go through calibration before a session.
 *
 * Three sources of truth:
 *   1. calibratedAt (our Zustand store) — was calibration ever done?
 *   2. trackerReady — is the pipeline alive in memory (same page session)?
 *   3. localStorage — did calibration data survive a page refresh?
 */
export async function shouldCalibrate(
  eyeTrackingEnabled: boolean,
  calibratedAt: number | null,
  trackerReady: boolean,
): Promise<boolean> {
  if (!eyeTrackingEnabled) return false
  if (!calibratedAt) return true
  // Same page session: tracker is alive with calibration data in memory
  if (trackerReady) return false
  // Page was refreshed: check if calibration data survived in localStorage
  return !(await hasCalibrationData())
}
