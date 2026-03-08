import { describe, it, expect, beforeEach } from 'vitest'
import { shouldCalibrate } from './shouldCalibrate'

beforeEach(() => {
  localStorage.clear()
})

describe('shouldCalibrate()', () => {
  it('returns false when eye tracking is disabled', () => {
    expect(shouldCalibrate(false, null)).toBe(false)
  })

  it('returns false when eye tracking is disabled even with calibratedAt', () => {
    expect(shouldCalibrate(false, Date.now())).toBe(false)
  })

  it('returns true when eye tracking is enabled but never calibrated', () => {
    expect(shouldCalibrate(true, null)).toBe(true)
  })

  it('returns true when calibratedAt is set but webgazer data is missing', () => {
    // This is the core corner case:
    // Our store says calibration happened, but WebGazer's data is gone.
    expect(shouldCalibrate(true, Date.now())).toBe(true)
  })

  it('returns false when calibratedAt is set AND webgazer data exists', () => {
    localStorage.setItem('webgazerGlobalData', '{"ridge":{"data":"..."}}')
    expect(shouldCalibrate(true, Date.now())).toBe(false)
  })

  it('returns true when calibratedAt is set but webgazer data is empty string', () => {
    localStorage.setItem('webgazerGlobalData', '')
    expect(shouldCalibrate(true, Date.now())).toBe(true)
  })
})
