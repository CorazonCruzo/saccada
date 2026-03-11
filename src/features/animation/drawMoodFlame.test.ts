import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawMoodFlame } from './drawMoodFlame'

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
    arc: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '' as string | CanvasGradient,
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

describe('drawMoodFlame', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('draws without errors for all 5 levels', () => {
    for (let level = 1; level <= 5; level++) {
      expect(() => drawMoodFlame(ctx, 50, 80, 1.0, level)).not.toThrow()
    }
  })

  it('calls save and restore', () => {
    drawMoodFlame(ctx, 50, 80, 1.0, 3)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws multiple elliptical layers (flame body)', () => {
    drawMoodFlame(ctx, 50, 80, 1.0, 3)
    // 45 flame layers (i = 0..44, layerCount = 44)
    expect((ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls.length).toBe(45)
  })

  it('does not draw a wick (removed)', () => {
    drawMoodFlame(ctx, 50, 80, 1.0, 3)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('draws ambient glow and base glow', () => {
    drawMoodFlame(ctx, 50, 80, 1.0, 3)
    // Two radial gradients: ambient glow + base glow
    expect((ctx.createRadialGradient as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
  })

  it('clamps out-of-range levels', () => {
    expect(() => drawMoodFlame(ctx, 50, 80, 1.0, 0)).not.toThrow()
    expect(() => drawMoodFlame(ctx, 50, 80, 1.0, 6)).not.toThrow()
    expect(() => drawMoodFlame(ctx, 50, 80, 1.0, -1)).not.toThrow()
  })

  it('respects scale parameter', () => {
    const ctx1 = createMockCtx()
    const ctx2 = createMockCtx()

    drawMoodFlame(ctx1, 50, 80, 1.0, 3, 1)
    drawMoodFlame(ctx2, 50, 80, 1.0, 3, 2)

    // Ellipse layers should use different radii at different scales
    const layers1 = (ctx1.ellipse as ReturnType<typeof vi.fn>).mock.calls
    const layers2 = (ctx2.ellipse as ReturnType<typeof vi.fn>).mock.calls
    // Compare vertical radius (arg index 3) of a middle layer
    expect(layers2[20][3]).toBeCloseTo(layers1[20][3] * 2, 5)
  })

  it('flame layers have positive width for all levels', () => {
    for (let level = 1; level <= 5; level++) {
      const mockCtx = createMockCtx()
      drawMoodFlame(mockCtx, 50, 80, 0, level)
      const calls = (mockCtx.ellipse as ReturnType<typeof vi.fn>).mock.calls
      for (const call of calls) {
        // ellipse(x, y, radiusX, radiusY, ...)
        expect(call[2]).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('time variation produces different sway positions', () => {
    const ctx1 = createMockCtx()
    const ctx2 = createMockCtx()

    // Use level 5 (restless) which has high sway
    drawMoodFlame(ctx1, 50, 80, 0, 5)
    drawMoodFlame(ctx2, 50, 80, 1.5, 5)

    const calls1 = (ctx1.ellipse as ReturnType<typeof vi.fn>).mock.calls
    const calls2 = (ctx2.ellipse as ReturnType<typeof vi.fn>).mock.calls

    // Check a middle layer
    const x1 = calls1[28][0]
    const x2 = calls2[28][0]
    expect(x1).not.toBe(x2)
  })

  it('level 5 (restless) has wider flicker than level 1 (calm)', () => {
    const ctx1 = createMockCtx()
    const ctx5 = createMockCtx()

    drawMoodFlame(ctx1, 50, 80, 0.5, 1)
    drawMoodFlame(ctx5, 50, 80, 0.5, 5)

    // Compare max radiusX across layers
    const widths1 = (ctx1.ellipse as ReturnType<typeof vi.fn>).mock.calls.map((c: number[]) => c[2])
    const widths5 = (ctx5.ellipse as ReturnType<typeof vi.fn>).mock.calls.map((c: number[]) => c[2])

    const max1 = Math.max(...widths1)
    const max5 = Math.max(...widths5)
    expect(max5).toBeGreaterThan(max1)
  })
})
