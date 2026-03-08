import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shouldCalibrate } from './shouldCalibrate'

// Mock localforage (used by hasWebGazerCalibrationData)
const mockStore: Record<string, unknown> = {}
vi.mock('localforage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStore[key] ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => { mockStore[key] = value }),
  },
}))

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key]
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
    // Tracker singleton is alive with calibration in memory — no IndexedDB needed
    expect(await shouldCalibrate(true, Date.now(), true)).toBe(false)
  })

  it('returns true when calibratedAt set, tracker not ready, no IndexedDB data (page refresh, data lost)', async () => {
    expect(await shouldCalibrate(true, Date.now(), false)).toBe(true)
  })

  it('returns false when calibratedAt set, tracker not ready, but IndexedDB has data (page refresh, data survived)', async () => {
    mockStore['webgazerGlobalData'] = [{ some: 'regression data' }]
    expect(await shouldCalibrate(true, Date.now(), false)).toBe(false)
  })
})
