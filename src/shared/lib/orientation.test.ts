import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isMobileDevice, isPortrait, tryLockLandscape, unlockOrientation } from './orientation'

// Save originals
const originalNavigator = navigator.userAgent
const originalInnerWidth = window.innerWidth
const originalInnerHeight = window.innerHeight

function mockUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  })
}

function mockViewport(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

afterEach(() => {
  Object.defineProperty(navigator, 'userAgent', {
    value: originalNavigator,
    configurable: true,
  })
  Object.defineProperty(window, 'innerWidth', {
    value: originalInnerWidth,
    configurable: true,
  })
  Object.defineProperty(window, 'innerHeight', {
    value: originalInnerHeight,
    configurable: true,
  })
})

describe('isMobileDevice', () => {
  it('returns true for Android phone', () => {
    mockUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36')
    mockViewport(412, 915)
    expect(isMobileDevice()).toBe(true)
  })

  it('returns true for iPhone', () => {
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    mockViewport(390, 844)
    expect(isMobileDevice()).toBe(true)
  })

  it('returns true for iPad', () => {
    mockUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')
    mockViewport(820, 1180)
    expect(isMobileDevice()).toBe(true)
  })

  it('returns false for desktop Chrome', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    mockViewport(1920, 1080)
    expect(isMobileDevice()).toBe(false)
  })

  it('returns false for large Android tablet treated as desktop-class', () => {
    mockUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36')
    mockViewport(1280, 1024)
    expect(isMobileDevice()).toBe(false)
  })
})

describe('isPortrait', () => {
  it('returns true when matchMedia reports portrait', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    } as MediaQueryList)

    expect(isPortrait()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(orientation: portrait)')
  })

  it('returns false when matchMedia reports landscape', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    } as MediaQueryList)

    expect(isPortrait()).toBe(false)
  })
})

describe('tryLockLandscape', () => {
  let origRequestFullscreen: typeof document.documentElement.requestFullscreen
  let origScreenOrientation: ScreenOrientation

  beforeEach(() => {
    origRequestFullscreen = document.documentElement.requestFullscreen
    origScreenOrientation = screen.orientation
  })

  afterEach(() => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: origRequestFullscreen,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(screen, 'orientation', {
      value: origScreenOrientation,
      configurable: true,
    })
  })

  it('returns true when fullscreen and lock both succeed', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    })
    Object.defineProperty(screen, 'orientation', {
      value: { lock: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })

    expect(await tryLockLandscape()).toBe(true)
  })

  it('returns false when orientation.lock throws (iOS)', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    })
    Object.defineProperty(screen, 'orientation', {
      value: { lock: vi.fn().mockRejectedValue(new Error('Not supported')) },
      configurable: true,
    })

    expect(await tryLockLandscape()).toBe(false)
  })

  it('returns false when no lock method available', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    })
    Object.defineProperty(screen, 'orientation', {
      value: { type: 'portrait-primary' },
      configurable: true,
    })

    expect(await tryLockLandscape()).toBe(false)
  })

  it('returns false when fullscreen request throws', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockRejectedValue(new Error('Fullscreen denied')),
      configurable: true,
      writable: true,
    })

    expect(await tryLockLandscape()).toBe(false)
  })
})

describe('unlockOrientation', () => {
  it('calls screen.orientation.unlock and document.exitFullscreen', async () => {
    const unlockSpy = vi.fn()
    const exitSpy = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(screen, 'orientation', {
      value: { unlock: unlockSpy },
      configurable: true,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      value: document.documentElement,
      configurable: true,
    })
    document.exitFullscreen = exitSpy

    await unlockOrientation()

    expect(unlockSpy).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalled()

    // Cleanup
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    })
  })

  it('does not throw when APIs are missing', async () => {
    Object.defineProperty(screen, 'orientation', {
      value: {},
      configurable: true,
    })
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    })

    await expect(unlockOrientation()).resolves.not.toThrow()
  })
})
