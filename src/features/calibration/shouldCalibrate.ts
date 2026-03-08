import { hasWebGazerCalibrationData } from './hasCalibrationData'

/**
 * Determine if the user should go through calibration before a session.
 *
 * Three sources of truth:
 *   1. calibratedAt (our Zustand store) — was calibration ever done?
 *   2. trackerReady — is the WebGazer singleton alive in memory (same page session)?
 *   3. localforage (IndexedDB) — did WebGazer's regression data survive a page refresh?
 *
 * We manually save regression data to localforage after calibration
 * (via EyeTracker.saveCalibration), because WebGazer's built-in save
 * only triggers from its mouse clickListener, which we disable.
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
  // Page was refreshed: check if regression data survived in IndexedDB
  return !(await hasWebGazerCalibrationData())
}
