import { describe, it, expect, beforeEach } from 'vitest'
import { shouldCalibrate } from './shouldCalibrate'

const CALIBRATION_KEY = 'saccada-calibration-data'

beforeEach(() => {
  localStorage.clear()
})

describe('shouldCalibrate()', () => {
  it('returns false when eye tracking is disabled', async () => {
    expect(await shouldCalibrate(false, null, false)).toBe(false)
  })

  it('returns false when eye tracking is disabled even with calibratedAt', async () => {
    expect(await shouldCalibrate(false, Date.now(), true)).toBe(false)
  })

  it('returns true when eye tracking is enabled but never calibrated', async () => {
    expect(await shouldCalibrate(true, null, false)).toBe(true)
  })

  it('returns true when never calibrated even if tracker is ready', async () => {
    expect(await shouldCalibrate(true, null, true)).toBe(true)
  })

  it('returns false when calibratedAt is set AND tracker is ready (same session)', async () => {
    expect(await shouldCalibrate(true, Date.now(), true)).toBe(false)
  })

  it('returns true when calibratedAt set, tracker not ready, no localStorage data (page refresh, data lost)', async () => {
    expect(await shouldCalibrate(true, Date.now(), false)).toBe(true)
  })

  it('returns false when calibratedAt set, tracker not ready, but localStorage has data (page refresh, data survived)', async () => {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify({ weightsX: [1], weightsY: [2] }))
    expect(await shouldCalibrate(true, Date.now(), false)).toBe(false)
  })
})
