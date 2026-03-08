import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hasWebGazerCalibrationData } from './hasCalibrationData'

beforeEach(() => {
  localStorage.clear()
})

describe('hasWebGazerCalibrationData()', () => {
  it('returns false when no webgazer data in localStorage', () => {
    expect(hasWebGazerCalibrationData()).toBe(false)
  })

  it('returns true when webgazer data exists in localStorage', () => {
    localStorage.setItem('webgazerGlobalData', '{"some":"data"}')
    expect(hasWebGazerCalibrationData()).toBe(true)
  })

  it('returns false when webgazer data is an empty string', () => {
    localStorage.setItem('webgazerGlobalData', '')
    expect(hasWebGazerCalibrationData()).toBe(false)
  })

  it('returns false when localStorage throws (e.g. private browsing)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(hasWebGazerCalibrationData()).toBe(false)
    spy.mockRestore()
  })

  it('is not affected by other localStorage keys', () => {
    localStorage.setItem('saccada-settings', '{"calibratedAt":12345}')
    localStorage.setItem('otherKey', 'value')
    expect(hasWebGazerCalibrationData()).toBe(false)
  })
})
