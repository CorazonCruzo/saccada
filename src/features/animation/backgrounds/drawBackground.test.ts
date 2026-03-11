import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawBackground } from './drawBackground'
import type { BackgroundPatternId } from '@/entities/pattern'

function createMockCtx() {
  const fillCalls: string[] = []
  const strokeCalls: string[] = []

  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    ellipse: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(() => { strokeCalls.push('stroke') }),
    fill: vi.fn(() => { fillCalls.push('fill') }),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    closePath: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    _fillCalls: fillCalls,
    _strokeCalls: strokeCalls,
  } as unknown as CanvasRenderingContext2D & { _fillCalls: string[]; _strokeCalls: string[] }
}

describe('drawBackground', () => {
  let ctx: ReturnType<typeof createMockCtx>

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('zen draws nothing', () => {
    drawBackground('zen', ctx, 100, 100, 0, 0, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).not.toHaveBeenCalled()
    expect(ctx.stroke).not.toHaveBeenCalled()
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it('aura draws a filled radial gradient', () => {
    drawBackground('aura', ctx, 200, 200, 0, 5000, 0.15, 1, '#aaa', '#bbb', '#ff6b35')
    expect(ctx.createRadialGradient).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('ripples draws 10 concentric circles', () => {
    drawBackground('ripples', ctx, 100, 100, 0, 1000, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.arc).toHaveBeenCalledTimes(10)
    expect(ctx.stroke).toHaveBeenCalledTimes(10)
  })

  it('fibonacci draws a spiral path with amplified rotation', () => {
    drawBackground('fibonacci', ctx, 100, 100, 0.5, 0, 0.12, 1, '#c4956a', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    // angle 0.5 is multiplied by internal ROTATION_FACTOR (6)
    expect(ctx.rotate).toHaveBeenCalledWith(3.0)
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('seed-of-life draws 7 circles', () => {
    drawBackground('seed-of-life', ctx, 100, 100, 0, 0, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.arc).toHaveBeenCalledTimes(7) // 1 center + 6 surrounding
  })

  it('torus delegates to drawMandala (5 rings + ellipses)', () => {
    drawBackground('mandala', ctx, 100, 100, 1.0, 0, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.ellipse).toHaveBeenCalledTimes(80) // same as drawMandala
    expect(ctx.arc).toHaveBeenCalledTimes(5)
  })

  it('flower-of-life draws 19 circles', () => {
    drawBackground('flower-of-life', ctx, 100, 100, 0, 0, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.arc).toHaveBeenCalledTimes(19)
  })

  it('metatrons-cube draws 13 circles + 78 connecting lines', () => {
    drawBackground('metatrons-cube', ctx, 100, 100, 0, 0, 0.1, 1, '#aaa', '#bbb', '#ccc')
    // 13 circles
    expect(ctx.arc).toHaveBeenCalledTimes(13)
    // 78 lines (13 choose 2 = 78) + 13 circles = 91 strokes
    expect(ctx.stroke).toHaveBeenCalledTimes(78 + 13)
  })

  it('penrose draws aperiodic tiling with fill and edges', () => {
    drawBackground('penrose', ctx, 100, 100, 0.5, 0, 0.12, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.rotate).toHaveBeenCalledWith(0.5)
    // Thick rhombi filled
    expect(ctx.fill).toHaveBeenCalledTimes(1)
    expect(ctx.closePath).toHaveBeenCalled()
    // Many edges stroked in a single batch
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
    // Subdivision produces thousands of edges
    expect(ctx.moveTo.mock.calls.length).toBeGreaterThan(1000)
    expect(ctx.lineTo.mock.calls.length).toBeGreaterThan(1000)
  })

  it('moire draws two sets of concentric circles', () => {
    drawBackground('moire', ctx, 100, 100, 0, 5000, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    // Two sets of 30 rings = 60 arcs, batched into 2 strokes
    expect(ctx.arc).toHaveBeenCalledTimes(60)
    expect(ctx.stroke).toHaveBeenCalledTimes(2)
  })

  it('standing-wave draws horizontal sinusoids', () => {
    drawBackground('standing-wave', ctx, 100, 100, 0, 5000, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    // 8 waves, each with its own beginPath + stroke
    expect(ctx.stroke).toHaveBeenCalledTimes(8)
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
  })

  it('perlin-flow draws flow field lines (mist + wisps)', () => {
    drawBackground('perlin-flow', ctx, 100, 100, 0, 5000, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    // 500 mist + 120 wisps = 620 strokes
    expect(ctx.stroke).toHaveBeenCalledTimes(620)
    expect(ctx.moveTo).toHaveBeenCalledTimes(620)
    // 500*15 + 120*50 = 13500 lineTo calls
    expect(ctx.lineTo).toHaveBeenCalledTimes(13500)
  })

  it('chladni draws resonance nodal lines', () => {
    drawBackground('chladni', ctx, 100, 100, 0, 5000, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    // In test env (no real canvas): fallback to fillRect grid
    // In browser: uses offscreen ImageData + drawImage
    const usedDrawImage = ctx.drawImage.mock.calls.length > 0
    const usedFillRect = ctx.fillRect.mock.calls.length > 0
    expect(usedDrawImage || usedFillRect).toBe(true)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('spiral-moire draws two opposing spiral sets', () => {
    drawBackground('spiral-moire', ctx, 100, 100, 0, 5000, 0.15, 1, '#aaa', '#bbb', '#ccc')
    expect(ctx.save).toHaveBeenCalled()
    // 12 arms (set A) + 11 arms (set B) = 23 strokes
    expect(ctx.stroke).toHaveBeenCalledTimes(23)
    expect(ctx.moveTo).toHaveBeenCalledTimes(23)
    // 201 points per arm, first is moveTo, rest lineTo = 200 * 23 = 4600
    expect(ctx.lineTo).toHaveBeenCalledTimes(200 * 23)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('all non-zen patterns save and restore context', () => {
    const patterns: BackgroundPatternId[] = ['aura', 'ripples', 'fibonacci', 'seed-of-life', 'mandala', 'flower-of-life', 'metatrons-cube', 'penrose', 'moire', 'standing-wave', 'perlin-flow', 'chladni', 'spiral-moire']
    for (const id of patterns) {
      const c = createMockCtx()
      drawBackground(id, c, 50, 50, 0, 1000, 0.1, 1, '#aaa', '#bbb', '#ccc')
      expect(c.save).toHaveBeenCalled()
      expect(c.restore).toHaveBeenCalled()
    }
  })

  it('scale affects geometry size', () => {
    const arcCalls1: number[][] = []
    const arcCalls2: number[][] = []

    const ctx1 = createMockCtx()
    ctx1.arc = vi.fn((...args: number[]) => { arcCalls1.push(args) })
    drawBackground('seed-of-life', ctx1, 100, 100, 0, 0, 0.15, 1, '#a', '#b', '#c')

    const ctx2 = createMockCtx()
    ctx2.arc = vi.fn((...args: number[]) => { arcCalls2.push(args) })
    drawBackground('seed-of-life', ctx2, 100, 100, 0, 0, 0.15, 2, '#a', '#b', '#c')

    // Center circle radius at scale 1: 50, at scale 2: 100
    expect(arcCalls1[0][2]).toBeCloseTo(50)
    expect(arcCalls2[0][2]).toBeCloseTo(100)
  })
})
