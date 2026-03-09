/** Iris and eye features extracted from MediaPipe Face Landmarker */
export interface EyeFeatures {
  leftIris: { x: number; y: number }
  rightIris: { x: number; y: number }
  /** Iris position relative to eye socket center, normalized by eye width/height */
  leftIrisRel: { x: number; y: number }
  rightIrisRel: { x: number; y: number }
  leftEyeOpenness: number
  rightEyeOpenness: number
  headPose: { yaw: number; pitch: number }
  timestamp: number
}

/** Serializable calibration data for Dexie persistence */
export interface CalibrationData {
  weightsX: number[]
  weightsY: number[]
  lambda: number
  timestamp: number
}

/** Raw gaze prediction from the pipeline */
export interface GazePrediction {
  x: number
  y: number
  confidence: number
}
