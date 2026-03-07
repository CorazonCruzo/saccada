import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { canVibrate, createEdgeDetector, pulseEdge, pulseTransition } from './haptics'

describe('haptics', () => {
  let savedMaxTouchPoints: PropertyDescriptor | undefined
  let savedOntouchstart: PropertyDescriptor | undefined

  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })
    // Mock touch support (mobile device)
    savedMaxTouchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
      writable: true,
      configurable: true,
    })
    savedOntouchstart = Object.getOwnPropertyDescriptor(globalThis, 'ontouchstart')
  })

  afterEach(() => {
    // Restore maxTouchPoints
    if (savedMaxTouchPoints) {
      Object.defineProperty(navigator, 'maxTouchPoints', savedMaxTouchPoints)
    } else {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    }
    // Restore ontouchstart
    if (savedOntouchstart) {
      Object.defineProperty(globalThis, 'ontouchstart', savedOntouchstart)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).ontouchstart
    }
  })

  describe('canVibrate', () => {
    it('returns true when vibrate and touch are available', () => {
      expect(canVibrate()).toBe(true)
    })

    it('returns false when navigator.vibrate is absent', () => {
      const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (navigator as any).vibrate
      expect(canVibrate()).toBe(false)
      if (descriptor) {
        Object.defineProperty(navigator, 'vibrate', descriptor)
      }
    })

    it('returns false on desktop (no touch, even with vibrate API)', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
        configurable: true,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).ontouchstart
      expect(canVibrate()).toBe(false)
    })

    it('returns true when ontouchstart exists even if maxTouchPoints is 0', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(globalThis, 'ontouchstart', {
        value: null,
        writable: true,
        configurable: true,
      })
      expect(canVibrate()).toBe(true)
    })
  })

  describe('pulseEdge', () => {
    it('calls vibrate with 15ms', () => {
      pulseEdge()
      expect(navigator.vibrate).toHaveBeenCalledWith(15)
    })
  })

  describe('pulseTransition', () => {
    it('calls vibrate with 40ms', () => {
      pulseTransition()
      expect(navigator.vibrate).toHaveBeenCalledWith(40)
    })
  })

  describe('createEdgeDetector', () => {
    it('does not pulse on first call', () => {
      const detect = createEdgeDetector()
      detect(0.9)
      // First call sets initial direction, no pulse
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })

    it('does not pulse during steady movement in one direction', () => {
      const detect = createEdgeDetector()
      detect(0.5)
      detect(0.7)
      detect(0.9)
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })

    it('pulses when direction reverses at edge (above threshold)', () => {
      const detect = createEdgeDetector()
      // Move up toward edge
      detect(0.7)
      detect(0.8)
      detect(0.95) // above threshold
      detect(0.90) // direction reversal while above 0.85
      expect(navigator.vibrate).toHaveBeenCalledWith(15)
    })

    it('does not pulse when direction reverses below threshold', () => {
      const detect = createEdgeDetector()
      detect(0.3)
      detect(0.5)
      detect(0.4) // reversal but well below 0.85
      expect(navigator.vibrate).not.toHaveBeenCalled()
    })

    it('pulses on negative edge too', () => {
      const detect = createEdgeDetector()
      detect(-0.7)
      detect(-0.8)
      detect(-0.95) // negative edge
      detect(-0.90) // reversal
      expect(navigator.vibrate).toHaveBeenCalledWith(15)
    })

    it('can pulse multiple times on multiple reversals', () => {
      const detect = createEdgeDetector()
      // First edge
      detect(0.8)
      detect(0.95)
      detect(0.90)
      expect(navigator.vibrate).toHaveBeenCalledTimes(1)

      // Move to opposite edge
      detect(0.5)
      detect(0)
      detect(-0.8)
      detect(-0.95)
      detect(-0.88)
      expect(navigator.vibrate).toHaveBeenCalledTimes(2)
    })
  })
})
