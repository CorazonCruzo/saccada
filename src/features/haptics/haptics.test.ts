import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEdgeDetector, pulseEdge, pulseTransition } from './haptics'

describe('haptics', () => {
  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
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
