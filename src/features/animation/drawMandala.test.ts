import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawMandala } from './drawMandala'

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('drawMandala', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('saves and restores canvas state', () => {
    drawMandala(ctx, 100, 100, 0)
    expect(ctx.save).toHaveBeenCalledOnce()
    expect(ctx.restore).toHaveBeenCalledOnce()
  })

  it('translates to center and rotates by time', () => {
    drawMandala(ctx, 200, 150, 1.5)
    expect(ctx.translate).toHaveBeenCalledWith(200, 150)
    expect(ctx.rotate).toHaveBeenCalledWith(1.5)
  })

  it('applies given opacity', () => {
    drawMandala(ctx, 0, 0, 0, 0.12)
    expect(ctx.globalAlpha).toBe(0.12)
  })

  it('uses default gold/turmeric colors when no colors provided', () => {
    const styles: string[] = []
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v: string) { styles.push(v) },
      get() { return styles[styles.length - 1] ?? '' },
    })

    drawMandala(ctx, 0, 0, 0)

    // 5 rings: even (0,2,4) = gold, odd (1,3) = turmeric
    // Each ring sets strokeStyle once for petals, then reuses for arc
    expect(styles.filter(c => c === '#c4956a').length).toBe(3) // rings 0, 2, 4
    expect(styles.filter(c => c === '#e8a838').length).toBe(2) // rings 1, 3
  })

  it('uses custom colors when provided', () => {
    const styles: string[] = []
    Object.defineProperty(ctx, 'strokeStyle', {
      set(v: string) { styles.push(v) },
      get() { return styles[styles.length - 1] ?? '' },
    })

    drawMandala(ctx, 0, 0, 0, 0.08, 1, '#ff0000', '#00ff00')

    expect(styles.filter(c => c === '#ff0000').length).toBe(3) // even rings
    expect(styles.filter(c => c === '#00ff00').length).toBe(2) // odd rings
  })

  it('draws 5 rings with increasing petal counts', () => {
    // Ring 0: 8 petals, Ring 1: 12, Ring 2: 16, Ring 3: 20, Ring 4: 24
    // Total ellipses = 8+12+16+20+24 = 80
    // Total arcs (ring circles) = 5
    drawMandala(ctx, 0, 0, 0)
    expect(ctx.ellipse).toHaveBeenCalledTimes(80)
    expect(ctx.arc).toHaveBeenCalledTimes(5)
  })

  it('scales ring radii and petal sizes by scale factor', () => {
    const ellipseCalls: number[][] = []
    ;(ctx as any).ellipse = vi.fn((...args: number[]) => { ellipseCalls.push(args) })

    drawMandala(ctx, 0, 0, 0, 0.08, 2)

    // First petal of ring 0: radius = (30 + 0*28) * 2 = 60
    // petal cr = (10 + 0*3) * 2 = 20, cr*0.4 = 8
    const firstPetal = ellipseCalls[0]
    expect(firstPetal[2]).toBeCloseTo(20)    // rx = cr
    expect(firstPetal[3]).toBeCloseTo(8)     // ry = cr * 0.4
  })
})
