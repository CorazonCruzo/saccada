import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkCameraPermission, requestCameraAccess } from './cameraPermission'

describe('checkCameraPermission', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns "unavailable" if getUserMedia is not supported', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(await checkCameraPermission()).toBe('unavailable')
  })

  it('returns "unavailable" if mediaDevices has no getUserMedia', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      writable: true,
      configurable: true,
    })
    expect(await checkCameraPermission()).toBe('unavailable')
  })

  it('returns permission state from Permissions API', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
      writable: true,
      configurable: true,
    })

    expect(await checkCameraPermission()).toBe('granted')
  })

  it('returns "prompt" if Permissions API is not supported', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn().mockRejectedValue(new Error('not supported')),
      },
      writable: true,
      configurable: true,
    })

    expect(await checkCameraPermission()).toBe('prompt')
  })
})

describe('requestCameraAccess', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false if getUserMedia is not supported', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    expect(await requestCameraAccess()).toBe(false)
  })

  it('returns true and stops tracks on success', async () => {
    const stopFn = vi.fn()
    const mockStream = {
      getTracks: () => [{ stop: stopFn }, { stop: stopFn }],
    }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    })

    expect(await requestCameraAccess()).toBe(true)
    expect(stopFn).toHaveBeenCalledTimes(2)
  })

  it('returns false when getUserMedia throws (denied)', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')),
      },
      writable: true,
      configurable: true,
    })

    expect(await requestCameraAccess()).toBe(false)
  })
})
