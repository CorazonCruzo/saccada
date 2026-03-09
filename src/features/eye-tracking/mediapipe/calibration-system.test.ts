import { describe, it, expect } from 'vitest'
import { CalibrationSystem } from './calibration-system'
import type { EyeFeatures } from './types'

/** Create synthetic eye features that map linearly to screen position */
function makeSyntheticFeatures(screenX: number, screenY: number, count: number): EyeFeatures[] {
  return Array.from({ length: count }, (_, i) => ({
    // Absolute iris positions (used for raw data, not by feature vector)
    leftIris: { x: screenX / 2000 + 0.001 * i, y: screenY / 1200 + 0.001 * i },
    rightIris: { x: screenX / 2000 + 0.05 + 0.001 * i, y: screenY / 1200 + 0.001 * i },
    // Relative iris positions — primary features, correlate linearly with screen coords
    leftIrisRel: { x: (screenX - 1000) / 4000 + 0.0005 * i, y: (screenY - 600) / 2400 + 0.0005 * i },
    rightIrisRel: { x: (screenX - 1000) / 4000 + 0.0005 * i, y: (screenY - 600) / 2400 + 0.0005 * i },
    leftEyeOpenness: 0.35,
    rightEyeOpenness: 0.35,
    headPose: { yaw: 0, pitch: 0 },
    timestamp: 1000 + i * 66,
  }))
}

describe('CalibrationSystem', () => {
  it('predict returns null before training', () => {
    const cal = new CalibrationSystem()
    const features: EyeFeatures = {
      leftIris: { x: 0.4, y: 0.4 },
      rightIris: { x: 0.6, y: 0.4 },
      leftIrisRel: { x: 0, y: 0 },
      rightIrisRel: { x: 0, y: 0 },
      leftEyeOpenness: 0.35,
      rightEyeOpenness: 0.35,
      headPose: { yaw: 0, pitch: 0 },
      timestamp: 0,
    }
    expect(cal.predict(features)).toBeNull()
  })

  it('hasModel is false before training', () => {
    expect(new CalibrationSystem().hasModel()).toBe(false)
  })

  it('trains and predicts with 9 calibration points', () => {
    const cal = new CalibrationSystem(0.1)

    // 3x3 grid on a 1920x1080 screen
    const screenPoints = [
      [192, 108], [960, 108], [1728, 108],
      [192, 540], [960, 540], [1728, 540],
      [192, 972], [960, 972], [1728, 972],
    ]

    for (const [sx, sy] of screenPoints) {
      cal.addPoint(sx, sy, makeSyntheticFeatures(sx, sy, 20))
    }

    const { accuracyPx } = cal.train()
    expect(accuracyPx).toBeLessThan(200)
    expect(cal.hasModel()).toBe(true)

    // Predict at center — should be close to (960, 540)
    const centerFeatures = makeSyntheticFeatures(960, 540, 1)[0]
    const pred = cal.predict(centerFeatures)!
    expect(pred).not.toBeNull()
    expect(pred.x).toBeGreaterThan(500)
    expect(pred.x).toBeLessThan(1400)
    expect(pred.y).toBeGreaterThan(200)
    expect(pred.y).toBeLessThan(900)
  })

  it('confidence reflects eye openness', () => {
    const cal = new CalibrationSystem(0.1)
    const points = [[960, 540]]
    for (const [sx, sy] of points) {
      cal.addPoint(sx, sy, makeSyntheticFeatures(sx, sy, 20))
    }
    cal.train()

    // Open eyes
    const open: EyeFeatures = {
      leftIris: { x: 0.48, y: 0.45 },
      rightIris: { x: 0.53, y: 0.45 },
      leftIrisRel: { x: -0.01, y: 0.02 },
      rightIrisRel: { x: -0.01, y: 0.02 },
      leftEyeOpenness: 0.4,
      rightEyeOpenness: 0.35,
      headPose: { yaw: 0, pitch: 0 },
      timestamp: 0,
    }
    const predOpen = cal.predict(open)!
    expect(predOpen.confidence).toBe(0.35)

    // Closed eyes
    const closed: EyeFeatures = {
      ...open,
      leftEyeOpenness: 0.02,
      rightEyeOpenness: 0.01,
    }
    const predClosed = cal.predict(closed)!
    expect(predClosed.confidence).toBe(0.01)
    expect(predClosed.confidence).toBeLessThan(predOpen.confidence)
  })

  it('export → import preserves predictions', () => {
    const cal = new CalibrationSystem(0.5)
    const screenPoints = [
      [200, 100], [1000, 500], [1800, 900],
    ]
    for (const [sx, sy] of screenPoints) {
      cal.addPoint(sx, sy, makeSyntheticFeatures(sx, sy, 15))
    }
    cal.train()

    const testFeatures: EyeFeatures = {
      leftIris: { x: 0.48, y: 0.45 },
      rightIris: { x: 0.53, y: 0.45 },
      leftIrisRel: { x: -0.01, y: 0.02 },
      rightIrisRel: { x: -0.01, y: 0.02 },
      leftEyeOpenness: 0.35,
      rightEyeOpenness: 0.35,
      headPose: { yaw: 0, pitch: 0 },
      timestamp: 0,
    }
    const predBefore = cal.predict(testFeatures)!

    const exported = cal.exportCalibration()!
    expect(exported).not.toBeNull()
    expect(exported.weightsX).toHaveLength(5)
    expect(exported.weightsY).toHaveLength(5)

    const cal2 = new CalibrationSystem()
    cal2.importCalibration(exported)
    const predAfter = cal2.predict(testFeatures)!

    expect(predAfter.x).toBeCloseTo(predBefore.x, 6)
    expect(predAfter.y).toBeCloseTo(predBefore.y, 6)
    expect(predAfter.confidence).toBe(predBefore.confidence)
  })

  it('reset clears model', () => {
    const cal = new CalibrationSystem()
    cal.addPoint(500, 300, makeSyntheticFeatures(500, 300, 10))
    cal.train()
    expect(cal.hasModel()).toBe(true)
    cal.reset()
    expect(cal.hasModel()).toBe(false)
  })

  it('ignores addPoint with empty samples', () => {
    const cal = new CalibrationSystem()
    cal.addPoint(500, 300, [])
    const { accuracyPx } = cal.train()
    expect(accuracyPx).toBe(Infinity)
  })
})
