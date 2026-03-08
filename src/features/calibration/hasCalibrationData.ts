/**
 * WebGazer stores regression/calibration data in localStorage
 * under the key "webgazerGlobalData" when saveDataAcrossSessions(true).
 *
 * Our Zustand store persists `calibratedAt` separately.
 * These can get out of sync: calibratedAt is set but WebGazer's
 * data was cleared (user cleared storage, quota exceeded, etc.).
 *
 * This function checks whether WebGazer's actual calibration data
 * exists in localStorage. Use it alongside `calibratedAt` to decide
 * if re-calibration is needed.
 */

const WEBGAZER_DATA_KEY = 'webgazerGlobalData'

export function hasWebGazerCalibrationData(): boolean {
  try {
    const data = localStorage.getItem(WEBGAZER_DATA_KEY)
    return data !== null && data.length > 0
  } catch {
    // localStorage not available (e.g. private browsing in some browsers)
    return false
  }
}
