import { describe, it, expect } from 'vitest'
import {
  buildDensityGrid,
  blurGrid,
  getHeatmapColor,
  computeFocusSegments,
} from './drawHeatmap'

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
    expect(result[0]).toBe(0) // (0,0) -- out of blur radius
  })

  it('preserves uniform grid', () => {
    const grid = new Float32Array(9).fill(5) // 3x3, all 5
    const result = blurGrid(grid, 3, 3, 1)
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(5, 1)
    }
  })
})

describe('getHeatmapColor', () => {
  it('returns transparent for intensity near 0', () => {
    const [, , , a] = getHeatmapColor(0)
    expect(a).toBe(0)
  })

  it('returns teal with low opacity for intensity=0.25', () => {
    const [r, g, b, a] = getHeatmapColor(0.25)
    expect(r).toBe(46)  // TEAL.r
    expect(g).toBe(196) // TEAL.g
    expect(b).toBe(182) // TEAL.b
    expect(a).toBe(90)  // 0.25/0.5 * 180
  })

  it('returns teal with full opacity at intensity=0.5', () => {
    const [r, g, b, a] = getHeatmapColor(0.5)
    expect(r).toBe(46)
    expect(g).toBe(196)
    expect(b).toBe(182)
    expect(a).toBe(180)
  })

  it('returns turmeric at intensity=0.75', () => {
    const [r, g, b, a] = getHeatmapColor(0.75)
    expect(r).toBe(232)  // TURMERIC.r
    expect(g).toBe(168)  // TURMERIC.g
    expect(b).toBe(56)   // TURMERIC.b
    expect(a).toBe(230)
  })

  it('returns saffron at intensity=1.0', () => {
    const [r, g, b, a] = getHeatmapColor(1)
    expect(r).toBe(255)
    expect(g).toBe(107)
    expect(b).toBe(53)
    expect(a).toBe(255)
  })

  it('clamps values below 0', () => {
    const color = getHeatmapColor(-1)
    expect(color).toEqual(getHeatmapColor(0))
  })

  it('clamps values above 1', () => {
    const color = getHeatmapColor(2)
    expect(color).toEqual(getHeatmapColor(1))
  })

  it('returns different colors for different intensities', () => {
    const c1 = getHeatmapColor(0.2)
    const c2 = getHeatmapColor(0.8)
    expect(c1).not.toEqual(c2)
  })

  it('interpolates between teal and turmeric in 0.5-0.75 range', () => {
    const [r, g, b] = getHeatmapColor(0.625) // midpoint of teal->turmeric
    expect(r).toBeGreaterThan(46)  // past TEAL.r
    expect(r).toBeLessThan(232)    // before TURMERIC.r
    expect(g).toBeLessThan(196)    // below TEAL.g (turmeric has lower g)
  })
})

describe('computeFocusSegments', () => {
  it('returns all null for empty points', () => {
    const result = computeFocusSegments([], 1000, 10)
    expect(result.length).toBe(10)
    expect(result.every((s) => s === null)).toBe(true)
  })

  it('returns all null when points lack dotX/dotY', () => {
    const points = [
      { x: 100, y: 100, t: 0 },
      { x: 200, y: 200, t: 1000 },
    ]
    const result = computeFocusSegments(points, 1000, 5)
    expect(result.every((s) => s === null)).toBe(true)
  })

  it('returns all 1.0 when gaze matches dot exactly', () => {
    const points = [
      { x: 100, y: 100, t: 0, dotX: 100, dotY: 100 },
      { x: 200, y: 200, t: 500, dotX: 200, dotY: 200 },
      { x: 300, y: 300, t: 1000, dotX: 300, dotY: 300 },
    ]
    const diagonal = Math.sqrt(1000 ** 2 + 800 ** 2)
    const result = computeFocusSegments(points, diagonal, 2)
    for (const seg of result) {
      if (seg !== null) expect(seg).toBe(1)
    }
  })

  it('returns 0 when gaze is far from dot', () => {
    const diagonal = 100
    const threshold = diagonal * 0.25 // 25px
    const points = [
      { x: 0, y: 0, t: 0, dotX: 80, dotY: 80 },     // dist ~113, > 25
      { x: 0, y: 0, t: 500, dotX: 80, dotY: 80 },
      { x: 0, y: 0, t: 1000, dotX: 80, dotY: 80 },
    ]
    const result = computeFocusSegments(points, diagonal, 2)
    for (const seg of result) {
      if (seg !== null) expect(seg).toBe(0)
    }
  })

  it('returns null for segments with no data', () => {
    // Points only in the first quarter of the timeline (t=0..100 of 0..1000)
    const points = [
      { x: 100, y: 100, t: 0, dotX: 100, dotY: 100 },
      { x: 100, y: 100, t: 50, dotX: 100, dotY: 100 },
      { x: 100, y: 100, t: 1000, dotX: 100, dotY: 100 },
    ]
    const result = computeFocusSegments(points, 2000, 4)
    // First and last segments have data, middle segments are null
    expect(result[0]).toBe(1)
    expect(result[1]).toBeNull()
    expect(result[2]).toBeNull()
    expect(result[3]).toBe(1)
  })

  it('returns all null when duration is zero', () => {
    const points = [
      { x: 100, y: 100, t: 500, dotX: 100, dotY: 100 },
      { x: 100, y: 100, t: 500, dotX: 100, dotY: 100 },
    ]
    const result = computeFocusSegments(points, 1000, 5)
    expect(result.every((s) => s === null)).toBe(true)
  })
})
