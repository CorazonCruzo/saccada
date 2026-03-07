import { describe, it, expect } from 'vitest'
import { getCalibrationPoints, getValidationPoints, computeAccuracy } from './calibration'

describe('getCalibrationPoints', () => {
  it('returns 9 points (3x3 grid)', () => {
    const points = getCalibrationPoints(1000, 800)
    expect(points).toHaveLength(9)
  })

  it('first point is top-left with padding', () => {
    const points = getCalibrationPoints(1000, 800, 0.1)
    expect(points[0].x).toBe(100) // 1000 * 0.1
    expect(points[0].y).toBe(80)  // 800 * 0.1
  })

  it('last point is bottom-right with padding', () => {
    const points = getCalibrationPoints(1000, 800, 0.1)
    expect(points[8].x).toBe(900) // 1000 - 100
    expect(points[8].y).toBe(720) // 800 - 80
  })

  it('center point is at screen center', () => {
    const points = getCalibrationPoints(1000, 800, 0.1)
    expect(points[4].x).toBe(500)
    expect(points[4].y).toBe(400)
  })

  it('all points are within bounds', () => {
    const points = getCalibrationPoints(1920, 1080, 0.1)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1920)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1080)
    }
  })

  it('points are unique', () => {
    const points = getCalibrationPoints(1000, 800)
    const unique = new Set(points.map(p => `${p.x},${p.y}`))
    expect(unique.size).toBe(9)
  })
})

describe('getValidationPoints', () => {
  it('returns requested number of points', () => {
    const points = getValidationPoints(1000, 800, 5)
    expect(points).toHaveLength(5)
  })

  it('returns at most available points', () => {
    // 9 calibration points, requesting 5
    const points = getValidationPoints(1000, 800, 5)
    expect(points.length).toBeLessThanOrEqual(9)
  })

  it('all points are within bounds', () => {
    const points = getValidationPoints(1920, 1080, 5)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1920)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1080)
    }
  })
})

describe('computeAccuracy', () => {
  it('returns Infinity for empty predictions', () => {
    const result = computeAccuracy([])
    expect(result.avgError).toBe(Infinity)
    expect(result.maxError).toBe(Infinity)
  })

  it('returns 0 for perfect predictions', () => {
    const result = computeAccuracy([
      { predicted: { x: 100, y: 100 }, actual: { x: 100, y: 100 } },
      { predicted: { x: 500, y: 300 }, actual: { x: 500, y: 300 } },
    ])
    expect(result.avgError).toBe(0)
    expect(result.maxError).toBe(0)
  })

  it('computes correct distance for known offsets', () => {
    const result = computeAccuracy([
      { predicted: { x: 103, y: 104 }, actual: { x: 100, y: 100 } }, // dist = 5
    ])
    expect(result.avgError).toBe(5)
    expect(result.maxError).toBe(5)
  })

  it('computes average and max correctly', () => {
    const result = computeAccuracy([
      { predicted: { x: 100, y: 100 }, actual: { x: 100, y: 100 } }, // 0
      { predicted: { x: 110, y: 100 }, actual: { x: 100, y: 100 } }, // 10
      { predicted: { x: 100, y: 120 }, actual: { x: 100, y: 100 } }, // 20
    ])
    expect(result.avgError).toBe(10)
    expect(result.maxError).toBe(20)
  })
})
