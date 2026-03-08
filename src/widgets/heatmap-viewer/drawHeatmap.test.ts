import { describe, it, expect } from 'vitest'
import { buildDensityGrid, blurGrid, getHeatmapColor } from './drawHeatmap'

describe('buildDensityGrid', () => {
  it('returns empty grid for no points', () => {
    const { grid, max } = buildDensityGrid([], 100, 100, 10)
    expect(max).toBe(0)
    expect(grid.every((v) => v === 0)).toBe(true)
  })

  it('counts points into correct cells', () => {
    const points = [
      { x: 5, y: 5, t: 0 },   // cell (0,0)
      { x: 15, y: 5, t: 0 },  // cell (1,0)
      { x: 5, y: 5, t: 0 },   // cell (0,0) again
    ]
    const { grid, cols, max } = buildDensityGrid(points, 100, 100, 10)
    expect(grid[0]).toBe(2) // cell (0,0) has 2 hits
    expect(grid[1]).toBe(1) // cell (1,0) has 1 hit
    expect(max).toBe(2)
    expect(cols).toBe(10)
  })

  it('ignores points outside bounds', () => {
    const points = [
      { x: -5, y: 5, t: 0 },
      { x: 200, y: 5, t: 0 },
      { x: 5, y: -10, t: 0 },
    ]
    const { max } = buildDensityGrid(points, 100, 100, 10)
    expect(max).toBe(0)
  })

  it('computes correct grid dimensions', () => {
    const { cols, rows } = buildDensityGrid([], 100, 80, 16)
    expect(cols).toBe(7) // ceil(100/16)
    expect(rows).toBe(5) // ceil(80/16)
  })
})

describe('blurGrid', () => {
  it('returns same shape array', () => {
    const grid = new Float32Array(12) // 4x3
    const result = blurGrid(grid, 4, 3, 1)
    expect(result.length).toBe(12)
  })

  it('spreads a single point to neighbors', () => {
    // 5x5 grid, single point in center
    const grid = new Float32Array(25)
    grid[12] = 10 // center cell (2,2)
    const result = blurGrid(grid, 5, 5, 1)

    // Center should have lower value (averaged with 8 zeros)
    expect(result[12]).toBeCloseTo(10 / 9, 1)
    // Adjacent cells should be positive
    expect(result[7]).toBeGreaterThan(0)  // (2,1)
    expect(result[11]).toBeGreaterThan(0) // (1,2)
    // Far corner should be 0
    expect(result[0]).toBe(0) // (0,0) — out of blur radius
  })

  it('preserves uniform grid', () => {
    const grid = new Float32Array(9).fill(5) // 3x3, all 5
    const result = blurGrid(grid, 3, 3, 1)
    // Blurring a uniform grid should keep it uniform
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(5, 1)
    }
  })
})

describe('getHeatmapColor', () => {
  it('returns transparent for t=0', () => {
    const [r, g, b, a] = getHeatmapColor(0)
    expect(a).toBe(0)
    expect(r).toBe(14) // bg-deep R
  })

  it('returns saffron for t=1', () => {
    const [r, g, b, a] = getHeatmapColor(1)
    expect(r).toBe(255)
    expect(g).toBe(107)
    expect(b).toBe(53)
    expect(a).toBe(255)
  })

  it('interpolates between stops', () => {
    const [r, g, b, a] = getHeatmapColor(0.5)
    // Mid-point should be around teal region
    expect(r).toBeGreaterThan(0)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(255)
  })

  it('clamps values below 0', () => {
    const color = getHeatmapColor(-1)
    expect(color).toEqual(getHeatmapColor(0))
  })

  it('clamps values above 1', () => {
    const color = getHeatmapColor(2)
    expect(color).toEqual(getHeatmapColor(1))
  })

  it('returns different colors for different t values', () => {
    const c1 = getHeatmapColor(0.2)
    const c2 = getHeatmapColor(0.8)
    expect(c1).not.toEqual(c2)
  })
})
