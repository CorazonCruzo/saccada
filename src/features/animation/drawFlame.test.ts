import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawFlame } from './drawFlame'

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

describe('drawFlame', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('draws without errors', () => {
    expect(() => drawFlame(ctx, 100, 200, 1.0)).not.toThrow()
  })

  it('calls save and restore', () => {
    drawFlame(ctx, 100, 200, 1.0)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws 45 elliptical flame layers (0..44)', () => {
    drawFlame(ctx, 100, 200, 1.0)
    expect((ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls.length).toBe(45)
  })

  it('draws the wick', () => {
    drawFlame(ctx, 100, 200, 1.0)
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  it('draws ambient glow and base glow (2 radial gradients)', () => {
    drawFlame(ctx, 100, 200, 1.0)
    expect((ctx.createRadialGradient as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2)
  })

  it('respects scale parameter', () => {
    const ctx1 = createMockCtx()
    const ctx2 = createMockCtx()

    drawFlame(ctx1, 100, 200, 1.0, 1)
    drawFlame(ctx2, 100, 200, 1.0, 2)

    // Wick dimensions scale: width = 3 * scale, height = 12 * scale
    const wick1 = (ctx1.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]
    const wick2 = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(wick2[2]).toBeCloseTo(wick1[2] * 2, 5)
    expect(wick2[3]).toBeCloseTo(wick1[3] * 2, 5)
  })

  it('flame layers have positive width', () => {
    const mockCtx = createMockCtx()
    drawFlame(mockCtx, 100, 200, 0)
    const calls = (mockCtx.ellipse as ReturnType<typeof vi.fn>).mock.calls
    for (const call of calls) {
      expect(call[2]).toBeGreaterThanOrEqual(1)
    }
  })

  it('time variation produces different sway positions', () => {
    const ctx1 = createMockCtx()
    const ctx2 = createMockCtx()

    drawFlame(ctx1, 100, 200, 0)
    drawFlame(ctx2, 100, 200, 1.5)

    const calls1 = (ctx1.ellipse as ReturnType<typeof vi.fn>).mock.calls
    const calls2 = (ctx2.ellipse as ReturnType<typeof vi.fn>).mock.calls

    // Check a middle layer (tip has most sway)
    const x1 = calls1[10][0]
    const x2 = calls2[10][0]
    expect(x1).not.toBe(x2)
  })
})
