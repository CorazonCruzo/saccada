import { describe, it, expect, beforeEach } from 'vitest'
import { hasCalibrationData } from './hasCalibrationData'

const CALIBRATION_KEY = 'saccada-calibration-data'

beforeEach(() => {
  localStorage.clear()
})

describe('hasCalibrationData()', () => {
  it('returns false when no calibration data in localStorage', async () => {
    expect(await hasCalibrationData()).toBe(false)
  })

  it('returns true when calibration data exists', async () => {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify({ weightsX: [1], weightsY: [2] }))
    expect(await hasCalibrationData()).toBe(true)
  })

  it('returns true even for empty string (key exists)', async () => {
    localStorage.setItem(CALIBRATION_KEY, '')
    expect(await hasCalibrationData()).toBe(true)
  })

  it('returns false after data is removed', async () => {
    localStorage.setItem(CALIBRATION_KEY, '{}')
    localStorage.removeItem(CALIBRATION_KEY)
    expect(await hasCalibrationData()).toBe(false)
  })
})