import { describe, it, expect } from 'vitest'
import { extractEyeFeatures, buildFeatureVector, type NormalizedLandmark } from './iris-extractor'

/** Create a minimal valid 478-landmark array with controllable key points */
function makeLandmarks(overrides: Record<number, Partial<NormalizedLandmark>> = {}): NormalizedLandmark[] {
  const base: NormalizedLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }))

  // Default realistic eye positions
  // Left eye
  base[33] = { x: 0.35, y: 0.40, z: 0 }    // outer
  base[133] = { x: 0.45, y: 0.40, z: 0 }   // inner
  base[159] = { x: 0.40, y: 0.37, z: 0 }   // top
  base[145] = { x: 0.40, y: 0.43, z: 0 }   // bottom
  base[468] = { x: 0.40, y: 0.40, z: 0 }   // iris center

  // Right eye
  base[362] = { x: 0.65, y: 0.40, z: 0 }   // outer
  base[263] = { x: 0.55, y: 0.40, z: 0 }   // inner
  base[386] = { x: 0.60, y: 0.37, z: 0 }   // top
  base[374] = { x: 0.60, y: 0.43, z: 0 }   // bottom
  base[473] = { x: 0.60, y: 0.40, z: 0 }   // iris center

  // Face
  base[1] = { x: 0.50, y: 0.55, z: 0 }     // nose tip
  base[152] = { x: 0.50, y: 0.75, z: 0 }   // chin

  for (const [idx, val] of Object.entries(overrides)) {
    base[Number(idx)] = { ...base[Number(idx)], ...val }
  }

  return base
}

describe('extractEyeFeatures', () => {
  it('returns null for empty landmarks', () => {
    expect(extractEyeFeatures([], 0)).toBeNull()
  })

  it('returns null for insufficient landmarks (< 478)', () => {
    const short = Array.from({ length: 400 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
    expect(extractEyeFeatures(short, 0)).toBeNull()
  })

  it('returns valid EyeFeatures for valid landmarks', () => {
    const landmarks = makeLandmarks()
    const features = extractEyeFeatures(landmarks, 12345)

    expect(features).not.toBeNull()
    expect(features!.leftIris.x).toBe(0.40)
    expect(features!.leftIris.y).toBe(0.40)
    expect(features!.rightIris.x).toBe(0.60)
    expect(features!.rightIris.y).toBe(0.40)
    expect(features!.timestamp).toBe(12345)
  })

  it('iris coordinates are in 0-1 range', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    expect(features.leftIris.x).toBeGreaterThanOrEqual(0)
    expect(features.leftIris.x).toBeLessThanOrEqual(1)
    expect(features.rightIris.y).toBeGreaterThanOrEqual(0)
    expect(features.rightIris.y).toBeLessThanOrEqual(1)
  })

  it('eye openness is between 0 and 1', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    expect(features.leftEyeOpenness).toBeGreaterThanOrEqual(0)
    expect(features.leftEyeOpenness).toBeLessThanOrEqual(1)
    expect(features.rightEyeOpenness).toBeGreaterThanOrEqual(0)
    expect(features.rightEyeOpenness).toBeLessThanOrEqual(1)
  })

  it('eye openness is ~0.6 for normal open eye', () => {
    // Eye height = |0.37 - 0.43| = 0.06, eye width ≈ |0.35 - 0.45| = 0.10
    // Openness = 0.06 / 0.10 = 0.6
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    expect(features.leftEyeOpenness).toBeCloseTo(0.6, 1)
  })

  it('eye openness is 0 when eye is closed (top = bottom)', () => {
    const closed = makeLandmarks({
      159: { x: 0.40, y: 0.40, z: 0 }, // top = bottom
      145: { x: 0.40, y: 0.40, z: 0 },
    })
    const features = extractEyeFeatures(closed, 0)!
    expect(features.leftEyeOpenness).toBe(0)
  })

  it('head pose yaw is ~0 when looking straight', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    expect(Math.abs(features.headPose.yaw)).toBeLessThan(0.1)
  })

  it('head pose yaw is positive when nose shifts right', () => {
    const turned = makeLandmarks({
      1: { x: 0.60, y: 0.55, z: 0 }, // nose shifted right
    })
    const features = extractEyeFeatures(turned, 0)!
    expect(features.headPose.yaw).toBeGreaterThan(0)
  })
})

describe('extractEyeFeatures — relative iris', () => {
  it('returns leftIrisRel and rightIrisRel fields', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    expect(features.leftIrisRel).toBeDefined()
    expect(features.rightIrisRel).toBeDefined()
    expect(typeof features.leftIrisRel.x).toBe('number')
    expect(typeof features.leftIrisRel.y).toBe('number')
  })

  it('relative iris is (0, 0) when iris is at eye center', () => {
    // Default landmarks: iris exactly at center of eye socket
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    expect(features.leftIrisRel.x).toBeCloseTo(0, 4)
    expect(features.leftIrisRel.y).toBeCloseTo(0, 4)
    expect(features.rightIrisRel.x).toBeCloseTo(0, 4)
    expect(features.rightIrisRel.y).toBeCloseTo(0, 4)
  })

  it('relative iris shifts when iris moves within eye socket', () => {
    // Shift left iris to the right (toward inner corner)
    const shifted = makeLandmarks({
      468: { x: 0.43, y: 0.40, z: 0 }, // iris shifted right from center (0.40)
    })
    const features = extractEyeFeatures(shifted, 0)!
    expect(features.leftIrisRel.x).toBeGreaterThan(0) // shifted toward inner
  })
})

describe('buildFeatureVector', () => {
  it('returns array of length 5', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    const vec = buildFeatureVector(features)
    expect(vec).toHaveLength(5)
  })

  it('last element is 1 (bias)', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    const vec = buildFeatureVector(features)
    expect(vec[4]).toBe(1)
  })

  it('contains avg iris, head pose, and bias', () => {
    const shifted = makeLandmarks({
      468: { x: 0.43, y: 0.41, z: 0 },
      473: { x: 0.63, y: 0.41, z: 0 },
    })
    const features = extractEyeFeatures(shifted, 0)!
    const vec = buildFeatureVector(features)
    const avgX = (features.leftIrisRel.x + features.rightIrisRel.x) / 2
    const avgY = (features.leftIrisRel.y + features.rightIrisRel.y) / 2
    expect(vec[0]).toBeCloseTo(avgX)
    expect(vec[1]).toBeCloseTo(avgY)
    expect(vec[2]).toBeCloseTo(features.headPose.yaw)
    expect(vec[3]).toBeCloseTo(features.headPose.pitch)
  })

  it('all values are finite numbers', () => {
    const features = extractEyeFeatures(makeLandmarks(), 0)!
    const vec = buildFeatureVector(features)
    for (const v of vec) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})
