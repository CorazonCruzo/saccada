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
    // 36 flame layers (0..35) + 1 glow arc = 37 beginPath calls
    expect((ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls.length).toBe(36)
  })

  it('draws the wick', () => {
    drawMoodFlame(ctx, 50, 80, 1.0, 3)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('draws the base glow', () => {
    drawMoodFlame(ctx, 50, 80, 1.0, 3)
    expect(ctx.createRadialGradient).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
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

    // With scale=2, the wick fillRect should use larger dimensions
    const wick1 = (ctx1.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]
    const wick2 = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]
    // wick width = 2 * scale, wick height = 8 * scale
    expect(wick2[2]).toBe(wick1[2] * 2) // width scaled
    expect(wick2[3]).toBe(wick1[3] * 2) // height scaled
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

    drawMoodFlame(ctx1, 50, 80, 0, 1)
    drawMoodFlame(ctx2, 50, 80, 1.5, 1)

    // Level 1 has high sway, so positions should differ at different times
    const calls1 = (ctx1.ellipse as ReturnType<typeof vi.fn>).mock.calls
    const calls2 = (ctx2.ellipse as ReturnType<typeof vi.fn>).mock.calls

    // Check a middle layer (index 18 = layer ~17 from bottom)
    const x1 = calls1[18][0]
    const x2 = calls2[18][0]
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
