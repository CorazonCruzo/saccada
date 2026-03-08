import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hasWebGazerCalibrationData } from './hasCalibrationData'

// Mock localforage
const mockStore: Record<string, unknown> = {}
vi.mock('localforage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStore[key] ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => { mockStore[key] = value }),
    removeItem: vi.fn(async (key: string) => { delete mockStore[key] }),
  },
}))

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key]
})

describe('hasWebGazerCalibrationData()', () => {
  it('returns false when no webgazer data in localforage', async () => {
    expect(await hasWebGazerCalibrationData()).toBe(false)
  })

  it('returns true when webgazer data exists in localforage', async () => {
    mockStore['webgazerGlobalData'] = [{ x: 1, y: 2, eyes: {} }]
    expect(await hasWebGazerCalibrationData()).toBe(true)
  })

  it('returns false when data is null', async () => {
    mockStore['webgazerGlobalData'] = null
    expect(await hasWebGazerCalibrationData()).toBe(false)
  })

  it('returns false when data is undefined', async () => {
    mockStore['webgazerGlobalData'] = undefined
    expect(await hasWebGazerCalibrationData()).toBe(false)
  })

  it('returns true even for empty array (WebGazer may store empty init state)', async () => {
    mockStore['webgazerGlobalData'] = []
    expect(await hasWebGazerCalibrationData()).toBe(true)
  })
})
