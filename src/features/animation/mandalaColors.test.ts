import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readMandalaColors } from './mandalaColors'

describe('readMandalaColors', () => {
  let originalGetComputedStyle: typeof window.getComputedStyle

  beforeEach(() => {
    originalGetComputedStyle = window.getComputedStyle
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })

  it('reads colors from CSS custom properties', () => {
    window.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === '--saccada-mandala-ring1') return ' #ff0000 '
        if (prop === '--saccada-mandala-ring2') return ' #00ff00 '
        return ''
      },
    }) as unknown as typeof window.getComputedStyle

    const [c1, c2] = readMandalaColors()
    expect(c1).toBe('#ff0000')
    expect(c2).toBe('#00ff00')
  })

  it('returns fallback gold/turmeric when CSS vars are empty', () => {
    window.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: () => '',
    }) as unknown as typeof window.getComputedStyle

    const [c1, c2] = readMandalaColors()
    expect(c1).toBe('#c4956a')
    expect(c2).toBe('#e8a838')
  })

  it('returns fallback when one var is empty and other is set', () => {
    window.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === '--saccada-mandala-ring1') return '#abc123'
        return ''
      },
    }) as unknown as typeof window.getComputedStyle

    const [c1, c2] = readMandalaColors()
    expect(c1).toBe('#abc123')
    expect(c2).toBe('#e8a838')
  })

  it('trims whitespace from values', () => {
    window.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === '--saccada-mandala-ring1') return '  oklch(0.55 0.08 286)  '
        if (prop === '--saccada-mandala-ring2') return '\toklch(0.50 0.07 284)\t'
        return ''
      },
    }) as unknown as typeof window.getComputedStyle

    const [c1, c2] = readMandalaColors()
    expect(c1).toBe('oklch(0.55 0.08 286)')
    expect(c2).toBe('oklch(0.50 0.07 284)')
  })
})
