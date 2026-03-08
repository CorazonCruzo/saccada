/**
 * WebGazer stores regression/calibration data in IndexedDB via localforage
 * under the key "webgazerGlobalData".
 *
 * This async function checks whether that data exists.
 * Used alongside `calibratedAt` and `trackerReady` to decide
 * if re-calibration is needed after a page refresh.
 */

const WEBGAZER_DATA_KEY = 'webgazerGlobalData'

export async function hasWebGazerCalibrationData(): Promise<boolean> {
  try {
    const localforage = (await import('localforage')).default
    const data = await localforage.getItem(WEBGAZER_DATA_KEY)
    return data !== null && data !== undefined
  } catch {
    return false
  }
}
