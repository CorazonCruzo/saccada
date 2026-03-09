import type { EyeFeatures } from './types'

/**
 * MediaPipe Face Landmarker key indices:
 * - Left iris center: 468
 * - Right iris center: 473
 * - Left eye: outer 33, inner 133, top 159, bottom 145
 * - Right eye: outer 362, inner 263, top 386, bottom 374
 * - Nose tip: 1, chin: 152, left eye outer: 33, right eye outer: 362
 */

interface NormalizedLandmark {
  x: number  // 0-1
  y: number  // 0-1
  z: number
}

// Landmark indices
const L_IRIS = 468
const R_IRIS = 473
const L_EYE_OUTER = 33
const L_EYE_INNER = 133
const L_EYE_TOP = 159
const L_EYE_BOTTOM = 145
const R_EYE_OUTER = 362
const R_EYE_INNER = 263
const R_EYE_TOP = 386
const R_EYE_BOTTOM = 374
const NOSE_TIP = 1
const CHIN = 152

const MIN_LANDMARKS = 478

/**
 * Extract eye features from raw MediaPipe face landmarks.
 * Returns null if landmarks are missing or insufficient.
 */
export function extractEyeFeatures(
  landmarks: NormalizedLandmark[],
  timestamp: number,
): EyeFeatures | null {
  if (!landmarks || landmarks.length < MIN_LANDMARKS) return null

  const leftIris = landmarks[L_IRIS]
  const rightIris = landmarks[R_IRIS]

  const leftOpenness = computeEyeOpenness(
    landmarks[L_EYE_TOP], landmarks[L_EYE_BOTTOM],
    landmarks[L_EYE_OUTER], landmarks[L_EYE_INNER],
  )
  const rightOpenness = computeEyeOpenness(
    landmarks[R_EYE_TOP], landmarks[R_EYE_BOTTOM],
    landmarks[R_EYE_OUTER], landmarks[R_EYE_INNER],
  )

  const headPose = estimateHeadPose(
    landmarks[NOSE_TIP], landmarks[CHIN],
    landmarks[L_EYE_OUTER], landmarks[R_EYE_OUTER],
  )

  const leftIrisRel = computeIrisRelative(
    leftIris,
    landmarks[L_EYE_OUTER], landmarks[L_EYE_INNER],
    landmarks[L_EYE_TOP], landmarks[L_EYE_BOTTOM],
  )
  const rightIrisRel = computeIrisRelative(
    rightIris,
    landmarks[R_EYE_OUTER], landmarks[R_EYE_INNER],
    landmarks[R_EYE_TOP], landmarks[R_EYE_BOTTOM],
  )

  return {
    leftIris: { x: leftIris.x, y: leftIris.y },
    rightIris: { x: rightIris.x, y: rightIris.y },
    leftIrisRel,
    rightIrisRel,
    leftEyeOpenness: leftOpenness,
    rightEyeOpenness: rightOpenness,
    headPose,
    timestamp,
  }
}

/**
 * Iris position relative to eye socket center, normalized by eye dimensions.
 * Removes head movement from iris signal, giving a purer gaze direction.
 * x: negative = towards nose, positive = towards temple. Range ~[-0.5, 0.5]
 * y: negative = looking up, positive = looking down. Range ~[-0.5, 0.5]
 */
function computeIrisRelative(
  iris: NormalizedLandmark,
  outer: NormalizedLandmark, inner: NormalizedLandmark,
  top: NormalizedLandmark, bottom: NormalizedLandmark,
): { x: number; y: number } {
  const eyeWidth = Math.sqrt((outer.x - inner.x) ** 2 + (outer.y - inner.y) ** 2)
  const eyeHeight = Math.abs(bottom.y - top.y)

  const cx = (outer.x + inner.x) / 2
  const cy = (top.y + bottom.y) / 2

  const x = eyeWidth > 1e-6 ? (iris.x - cx) / eyeWidth : 0
  const y = eyeHeight > 1e-6 ? (iris.y - cy) / eyeHeight : 0

  return { x, y }
}

/**
 * Eye openness: ratio of vertical distance (top-bottom) to horizontal (outer-inner).
 * 0 = closed, ~0.25-0.4 = normal open eye.
 */
function computeEyeOpenness(
  top: NormalizedLandmark, bottom: NormalizedLandmark,
  outer: NormalizedLandmark, inner: NormalizedLandmark,
): number {
  const height = Math.abs(top.y - bottom.y)
  const width = Math.sqrt(
    (outer.x - inner.x) ** 2 + (outer.y - inner.y) ** 2,
  )
  if (width < 1e-6) return 0
  return Math.min(height / width, 1)
}

/**
 * Simple head pose estimation from face geometry.
 * Yaw: horizontal rotation (left/right turn)
 * Pitch: vertical rotation (up/down nod)
 */
function estimateHeadPose(
  nose: NormalizedLandmark, chin: NormalizedLandmark,
  leftEye: NormalizedLandmark, rightEye: NormalizedLandmark,
): { yaw: number; pitch: number } {
  // Yaw: nose X relative to midpoint of eyes
  const eyeMidX = (leftEye.x + rightEye.x) / 2
  const eyeSpan = Math.abs(rightEye.x - leftEye.x)
  const yaw = eyeSpan > 1e-6 ? (nose.x - eyeMidX) / eyeSpan : 0

  // Pitch: nose Y relative to eye-chin midpoint
  const eyeMidY = (leftEye.y + rightEye.y) / 2
  const faceHeight = Math.abs(chin.y - eyeMidY)
  const noseMid = (nose.y - eyeMidY) / (faceHeight || 1)
  // Normal pitch: nose is ~0.33 down from eyes. Deviation = pitch.
  const pitch = noseMid - 0.33

  return { yaw, pitch }
}

/**
 * Build the feature vector for ridge regression.
 *
 * Separate L/R iris model: each eye's iris position is an independent
 * feature, allowing the regression to weight each eye differently.
 * When looking right, the left eye gives better iris tracking (less
 * occluded by nose), and vice versa. This addresses the asymmetric
 * Y-signal compression seen in calibration data.
 */
export function buildFeatureVector(features: EyeFeatures): number[] {
  const avgX = (features.leftIrisRel.x + features.rightIrisRel.x) / 2
  const avgY = (features.leftIrisRel.y + features.rightIrisRel.y) / 2
  return [
    avgX,                     // 0: average relative iris X
    avgY,                     // 1: average relative iris Y
    features.headPose.yaw,    // 2: head yaw
    features.headPose.pitch,  // 3: head pitch
    1,                        // 4: bias (not regularized)
  ]
}

export type { NormalizedLandmark }
