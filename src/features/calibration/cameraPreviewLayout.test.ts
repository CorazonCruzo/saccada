import { describe, it, expect } from 'vitest'
import {
  computeCameraPreviewLayout,
  isCalibrationViewportSupported,
  overlapsAnyPoint,
  MIN_CALIBRATION_WIDTH,
  MIN_CALIBRATION_HEIGHT,
  POINT_MARGIN,
} from './cameraPreviewLayout'
import { getCalibrationPoints } from './calibration'

// Common viewport sizes
const VIEWPORTS = [
  { name: 'Full HD', w: 1920, h: 1080 },
  { name: 'MacBook 13"', w: 1440, h: 900 },
  { name: 'Small laptop', w: 1280, h: 720 },
  { name: 'iPad landscape', w: 1024, h: 768 },
  { name: 'iPad portrait', w: 768, h: 1024 },
  { name: 'Small window', w: 800, h: 600 },
]

const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', w: 375, h: 667 },
  { name: 'iPhone 11', w: 414, h: 896 },
  { name: 'Galaxy S21', w: 360, h: 800 },
  { name: 'Narrow window', w: 600, h: 800 },
  { name: 'Short window', w: 900, h: 400 },
]

describe('isCalibrationViewportSupported', () => {
  it('returns true for desktop/tablet viewports', () => {
    for (const vp of VIEWPORTS) {
      expect(isCalibrationViewportSupported(vp.w, vp.h)).toBe(true)
    }
  })

  it('returns false for mobile viewports', () => {
    for (const vp of MOBILE_VIEWPORTS) {
      expect(isCalibrationViewportSupported(vp.w, vp.h)).toBe(false)
    }
  })

  it('returns false at exact boundary minus one', () => {
    expect(isCalibrationViewportSupported(MIN_CALIBRATION_WIDTH - 1, MIN_CALIBRATION_HEIGHT)).toBe(false)
    expect(isCalibrationViewportSupported(MIN_CALIBRATION_WIDTH, MIN_CALIBRATION_HEIGHT - 1)).toBe(false)
  })

  it('returns true at exact boundary', () => {
    expect(isCalibrationViewportSupported(MIN_CALIBRATION_WIDTH, MIN_CALIBRATION_HEIGHT)).toBe(true)
  })
})

describe('overlapsAnyPoint', () => {
  const points = [{ x: 100, y: 100 }, { x: 500, y: 500 }]

  it('detects overlap when point is inside rect', () => {
    expect(overlapsAnyPoint({ x: 50, y: 50, width: 200, height: 200 }, points, 0)).toBe(true)
  })

  it('detects overlap within margin', () => {
    // Rect ends at x=80, point at x=100, margin=25: 80+25=105 > 100
    expect(overlapsAnyPoint({ x: 0, y: 0, width: 80, height: 80 }, points, 25)).toBe(true)
  })

  it('returns false when no overlap', () => {
    expect(overlapsAnyPoint({ x: 200, y: 200, width: 100, height: 100 }, points, 10)).toBe(false)
  })

  it('returns false for empty points', () => {
    expect(overlapsAnyPoint({ x: 0, y: 0, width: 1000, height: 1000 }, [], 30)).toBe(false)
  })
})

describe('computeCameraPreviewLayout', () => {
  it('returns null for mobile viewports', () => {
    for (const vp of MOBILE_VIEWPORTS) {
      expect(computeCameraPreviewLayout(vp.w, vp.h)).toBeNull()
    }
  })

  it('returns a layout for all common desktop/tablet viewports', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)
      expect(layout).not.toBeNull()
    }
  })

  it('preview does not overlap any calibration point on common viewports', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)!
      const points = getCalibrationPoints(vp.w, vp.h)
      expect(overlapsAnyPoint(layout, points, POINT_MARGIN)).toBe(false)
    }
  })

  it('preview stays within viewport bounds', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)!
      expect(layout.x).toBeGreaterThanOrEqual(0)
      expect(layout.y).toBeGreaterThanOrEqual(0)
      expect(layout.x + layout.width).toBeLessThanOrEqual(vp.w)
      expect(layout.y + layout.height).toBeLessThanOrEqual(vp.h)
    }
  })

  it('preview maintains approximately 4:3 aspect ratio', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)!
      const ratio = layout.width / layout.height
      // Allow ±0.05 for rounding
      expect(ratio).toBeCloseTo(4 / 3, 1)
    }
  })

  it('preview width is at least 160px', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)!
      expect(layout.width).toBeGreaterThanOrEqual(160)
    }
  })

  it('preview fills available cell space (not fixed small size)', () => {
    // On Full HD the bottom-right cell is large; preview should be much bigger than 320px
    const layout = computeCameraPreviewLayout(1920, 1080)!
    expect(layout.width).toBeGreaterThan(320)
  })

  it('preview scales with viewport size', () => {
    const small = computeCameraPreviewLayout(800, 600)!
    const large = computeCameraPreviewLayout(1920, 1080)!
    expect(large.width).toBeGreaterThan(small.width)
  })

  it('has at least 30px margin from nearest calibration point', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)!
      const points = getCalibrationPoints(vp.w, vp.h)

      for (const p of points) {
        const insideExpanded =
          p.x >= layout.x - POINT_MARGIN &&
          p.x <= layout.x + layout.width + POINT_MARGIN &&
          p.y >= layout.y - POINT_MARGIN &&
          p.y <= layout.y + layout.height + POINT_MARGIN
        expect(insideExpanded).toBe(false)
      }
    }
  })

  it('preview is centered in the bottom-right cell', () => {
    for (const vp of VIEWPORTS) {
      const layout = computeCameraPreviewLayout(vp.w, vp.h)!
      const points = getCalibrationPoints(vp.w, vp.h)

      // Cell bounds
      const cellLeft = points[4].x + POINT_MARGIN
      const cellRight = points[8].x - POINT_MARGIN
      const cellTop = points[4].y + POINT_MARGIN
      const cellBottom = points[8].y - POINT_MARGIN

      const cellCenterX = (cellLeft + cellRight) / 2
      const cellCenterY = (cellTop + cellBottom) / 2
      const previewCenterX = layout.x + layout.width / 2
      const previewCenterY = layout.y + layout.height / 2

      // Allow 1px tolerance for rounding
      expect(Math.abs(previewCenterX - cellCenterX)).toBeLessThanOrEqual(1)
      expect(Math.abs(previewCenterY - cellCenterY)).toBeLessThanOrEqual(1)
    }
  })
})
