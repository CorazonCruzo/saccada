import { GazePipeline } from './mediapipe/pipeline'
import type { NormalizedLandmark } from './mediapipe/iris-extractor'
import type { EyeFeatures } from './mediapipe/types'

export interface GazePoint {
  x: number
  y: number
  t: number
  /** Actual dot X at this moment (recorded during session, avoids reconstruction) */
  dotX?: number
  /** Actual dot Y at this moment */
  dotY?: number
}

type GazeCallback = (point: GazePoint) => void

/**
 * Eye tracker using custom MediaPipe Face Landmarker + Ridge Regression pipeline.
 * Replaces the former WebGazer-based implementation.
 *
 * Preserves the same public interface used by:
 *   - useEyeTracking hook (singleton)
 *   - SessionPage (gaze callback)
 *   - CalibrationPage (calibration flow)
 *   - SettingsPanel (isReady check)
 *
 * Camera lifecycle:
 *   start()       — first call: full init (loads MediaPipe WASM + model).
 *                   Later calls: re-acquire camera + resume.
 *   sleep()       — stop processing loop, stop camera tracks, hide video.
 *   start() again — re-acquire camera, resume processing.
 *   destroy()     — page unload only.
 */
export class EyeTracker {
  private pipeline = new GazePipeline()
  private calibrationSamples: EyeFeatures[] = []

  /**
   * Start webcam + gaze tracking.
   * First call: full init (loads MediaPipe WASM + model, ~5MB).
   * After sleep(): re-acquires camera and resumes.
   */
  async start(onGaze: GazeCallback): Promise<void> {
    // On first start after page load, try loading saved calibration
    if (!this.pipeline.isReady() && !this.pipeline.isCalibrated()) {
      this.pipeline.loadCalibration()
    }
    await this.pipeline.start(onGaze)
  }

  /** Pause gaze processing (camera stays on) */
  setRunning(value: boolean): void {
    this.pipeline.setRunning(value)
  }

  /** Show or hide the webcam video preview during calibration */
  showVideo(visible: boolean): void {
    this.pipeline.showVideo(visible)
  }

  /** Access the raw video element for custom positioning/styling */
  getVideoElement(): HTMLVideoElement | null {
    return this.pipeline.getVideoElement()
  }

  /**
   * Record a calibration sample at screen position (x, y).
   * Captures current eye features and accumulates for the current point.
   * Returns true if a sample was captured (face detected), false otherwise.
   */
  recordCalibrationPoint(_x: number, _y: number): boolean {
    const sample = this.pipeline.captureCalibrationSample()
    if (!sample) return false
    // Filter blinks — closed eyes produce unreliable iris landmarks
    if (sample.leftEyeOpenness < 0.15 || sample.rightEyeOpenness < 0.15) return false
    this.calibrationSamples.push(sample)
    return true
  }

  /**
   * Finalize the current calibration point and start a new one.
   * Called after all clicks for one point are done.
   */
  finalizeCalibrationPoint(x: number, y: number): void {
    if (this.calibrationSamples.length > 0) {
      this.pipeline.addCalibrationPoint(x, y, this.calibrationSamples)
      this.calibrationSamples = []
    }
  }

  /** Train the calibration model after all 9 points. Returns accuracy in px. */
  trainCalibration(): { accuracyPx: number } {
    return this.pipeline.trainCalibration()
  }

  /** Clear calibration data for recalibration */
  clearData(): void {
    this.calibrationSamples = []
    this.pipeline.clearCalibration()
  }

  /** Persist calibration data to localStorage */
  async saveCalibration(): Promise<void> {
    await this.pipeline.saveCalibration()
  }

  /** Get a single gaze prediction (for validation) */
  async predict(): Promise<{ x: number; y: number } | null> {
    return this.pipeline.predict()
  }

  /** Subscribe to raw face landmarks for rendering face mesh overlay */
  setLandmarkCallback(cb: ((landmarks: NormalizedLandmark[]) => void) | null): void {
    this.pipeline.setLandmarkCallback(cb)
  }

  isFaceDetected(): boolean { return this.pipeline.isFaceDetected() }
  isReady(): boolean { return this.pipeline.isReady() }
  isRunning(): boolean { return this.pipeline.isRunning() }
  isCalibrated(): boolean { return this.pipeline.isCalibrated() }

  /**
   * Stop camera, hide video, pause processing.
   * Pipeline stays initialized for quick resume.
   */
  sleep(): void {
    this.pipeline.sleep()
  }

  /** Hard cleanup: page unload only. */
  destroy(): void {
    this.pipeline.destroy()
  }
}
