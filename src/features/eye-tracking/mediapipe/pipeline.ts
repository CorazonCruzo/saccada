import { extractEyeFeatures } from './iris-extractor'
import type { NormalizedLandmark } from './iris-extractor'
import { CalibrationSystem } from './calibration-system'
import type { EyeFeatures, CalibrationData, GazePrediction } from './types'

/** Callback signature matching existing GazePoint consumer interface */
type GazeCallback = (point: { x: number; y: number; t: number }) => void
type LandmarkCallback = (landmarks: NormalizedLandmark[]) => void

const THROTTLE_MS = 50 // ~20fps
const CALIBRATION_STORAGE_KEY = 'saccada-calibration-data'

/**
 * Custom eye tracking pipeline: MediaPipe Face Landmarker + Ridge Regression.
 *
 * Replaces WebGazer.js. Preserves the same external interface:
 *   - start(onGaze) → begins camera + tracking
 *   - sleep() → pauses camera + processing
 *   - destroy() → full cleanup
 *   - Gaze callback emits {x, y, t} in viewport pixels
 *
 * Lazy-loads @mediapipe/tasks-vision only when needed.
 */
/** EMA smoothing alpha — lower = smoother, higher = more responsive */
const EMA_ALPHA = 0.3

export class GazePipeline {
  private faceLandmarker: any = null // FaceLandmarker (lazy-loaded type)
  private calibration: CalibrationSystem
  private videoElement: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private callback: GazeCallback | null = null
  private running = false
  private ready = false
  private cameraLive = false
  private lastProcessTime = 0
  private rafId = 0
  private startTime = 0
  private landmarkCb: LandmarkCallback | null = null
  private cachedLandmarks: NormalizedLandmark[] | null = null
  private smoothedFeatures: EyeFeatures | null = null

  constructor() {
    this.calibration = new CalibrationSystem()
  }

  /**
   * Start webcam + gaze tracking.
   * First call: full init (loads MediaPipe WASM + model).
   * After sleep(): re-acquires camera and resumes.
   */
  async start(onGaze: GazeCallback): Promise<void> {
    this.callback = onGaze

    if (this.ready) {
      // Resume after sleep
      if (!this.cameraLive) {
        await this.acquireCamera()
      }
      this.running = true
      this.startProcessingLoop()
      return
    }

    // First-time initialization
    await this.initMediaPipe()
    await this.acquireCamera()
    this.startTime = performance.now()
    this.ready = true
    this.running = true
    this.startProcessingLoop()
  }

  /** Pause gaze processing without stopping camera */
  setRunning(value: boolean): void {
    this.running = value
  }

  /** Subscribe to raw face landmarks (for face mesh overlay) */
  setLandmarkCallback(cb: LandmarkCallback | null): void {
    this.landmarkCb = cb
  }

  /**
   * Show or hide the video preview.
   * Unlike WebGazer, we manage the video element ourselves.
   */
  showVideo(visible: boolean): void {
    if (!this.videoElement) return
    this.videoElement.style.opacity = visible ? '1' : '0'
    this.videoElement.style.pointerEvents = visible ? 'auto' : 'none'
  }

  /**
   * Capture a calibration sample from the latest cached landmarks.
   * Returns null if no face was detected in the last processing frame.
   */
  captureCalibrationSample(): EyeFeatures | null {
    if (!this.cachedLandmarks) return null
    return extractEyeFeatures(this.cachedLandmarks, performance.now())
  }

  /** Add a full calibration point (screen coords + collected samples) */
  addCalibrationPoint(x: number, y: number, samples: EyeFeatures[]): void {
    this.calibration.addPoint(x, y, samples)
  }

  /** Train the calibration model. Returns accuracy in pixels. */
  trainCalibration(): { accuracyPx: number } {
    return this.calibration.train()
  }

  /** Clear calibration data for recalibration */
  clearCalibration(): void {
    this.calibration.reset()
    this.smoothedFeatures = null
  }

  /** Get a single prediction from cached landmarks (for validation) */
  predict(): GazePrediction | null {
    if (!this.calibration.hasModel() || !this.cachedLandmarks) return null
    const features = extractEyeFeatures(this.cachedLandmarks, performance.now())
    if (!features) return null

    // Use smoothed features for prediction (same as processing loop)
    this.smoothedFeatures = this.smoothedFeatures
      ? emaSmooth(this.smoothedFeatures, features, EMA_ALPHA)
      : features

    return this.calibration.predict(this.smoothedFeatures)
  }

  /** Save calibration to localStorage */
  async saveCalibration(): Promise<void> {
    const data = this.calibration.exportCalibration()
    if (!data) return
    try {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or unavailable — non-fatal
    }
  }

  /** Load calibration from localStorage */
  loadCalibration(): boolean {
    try {
      const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY)
      if (!raw) return false
      const data: CalibrationData = JSON.parse(raw)
      if (!data.weightsX || !data.weightsY) return false
      // Reject incompatible calibrations (e.g. old feature vector length)
      if (data.weightsX.length !== 5 || data.weightsY.length !== 5) {
        localStorage.removeItem(CALIBRATION_STORAGE_KEY)
        return false
      }
      this.calibration.importCalibration(data)
      return true
    } catch {
      return false
    }
  }

  isReady(): boolean { return this.ready }
  isRunning(): boolean { return this.running }
  isCalibrated(): boolean { return this.calibration.hasModel() }
  isFaceDetected(): boolean { return this.cachedLandmarks !== null }

  getCalibrationSystem(): CalibrationSystem {
    return this.calibration
  }

  /**
   * Stop camera, hide video, pause processing.
   * Pipeline stays initialized for quick resume.
   */
  sleep(): void {
    this.running = false
    this.callback = null
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.showVideo(false)
    this.stopCameraTracks()
  }

  /**
   * Hard cleanup. After this, pipeline cannot be restarted.
   */
  destroy(): void {
    this.running = false
    this.ready = false
    this.callback = null
    this.cameraLive = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.stopCameraTracks()
    if (this.faceLandmarker) {
      try { this.faceLandmarker.close() } catch { /* noop */ }
      this.faceLandmarker = null
    }
    if (this.videoElement) {
      this.videoElement.remove()
      this.videoElement = null
    }
  }

  /** Reset smoothing state (e.g. after recalibration) */
  resetSmoothing(): void {
    this.smoothedFeatures = null
  }

  // ── Private ──

  private async initMediaPipe(): Promise<void> {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
    )
    this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    })
  }

  private async acquireCamera(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    })
    this.stream = stream

    if (!this.videoElement) {
      this.videoElement = document.createElement('video')
      this.videoElement.setAttribute('playsinline', '')
      this.videoElement.setAttribute('autoplay', '')
      this.videoElement.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-55%);' +
        'width:480px;height:360px;z-index:50;opacity:0;pointer-events:none;' +
        'border-radius:8px;object-fit:cover;'
      document.body.appendChild(this.videoElement)
    }

    this.videoElement.srcObject = stream

    // Wait for first frame
    if (!this.videoElement.videoWidth) {
      await new Promise<void>((resolve) => {
        this.videoElement!.addEventListener('loadeddata', () => resolve(), { once: true })
      })
    }
    this.cameraLive = true
  }

  private stopCameraTracks(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
      this.stream = null
    }
    this.cameraLive = false
  }

  private startProcessingLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId)

    const loop = () => {
      if (!this.running) return
      this.rafId = requestAnimationFrame(loop)

      const now = performance.now()
      if (now - this.lastProcessTime < THROTTLE_MS) return
      this.lastProcessTime = now

      if (!this.faceLandmarker || !this.videoElement || !this.cameraLive) return

      const result = this.faceLandmarker.detectForVideo(this.videoElement, now)
      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        this.cachedLandmarks = null
        return
      }

      this.cachedLandmarks = result.faceLandmarks[0]

      // Emit raw landmarks for face mesh overlay
      if (this.landmarkCb) {
        this.landmarkCb(this.cachedLandmarks)
      }

      // Gaze prediction requires a trained calibration model
      if (!this.calibration.hasModel()) return

      const features = extractEyeFeatures(result.faceLandmarks[0], now)
      if (!features) return

      // Temporal smoothing: EMA on features to reduce iris landmark jitter
      this.smoothedFeatures = this.smoothedFeatures
        ? emaSmooth(this.smoothedFeatures, features, EMA_ALPHA)
        : features

      const prediction = this.calibration.predict(this.smoothedFeatures)
      if (!prediction) return

      const elapsed = now - this.startTime
      this.callback?.({ x: prediction.x, y: prediction.y, t: elapsed })
    }

    this.rafId = requestAnimationFrame(loop)
  }
}

/**
 * Exponential moving average on EyeFeatures.
 * Smooths all numeric fields to reduce frame-to-frame jitter.
 * result = alpha * current + (1 - alpha) * previous
 */
function emaSmooth(prev: EyeFeatures, curr: EyeFeatures, alpha: number): EyeFeatures {
  const a = alpha
  const b = 1 - alpha
  return {
    leftIris: {
      x: a * curr.leftIris.x + b * prev.leftIris.x,
      y: a * curr.leftIris.y + b * prev.leftIris.y,
    },
    rightIris: {
      x: a * curr.rightIris.x + b * prev.rightIris.x,
      y: a * curr.rightIris.y + b * prev.rightIris.y,
    },
    leftIrisRel: {
      x: a * curr.leftIrisRel.x + b * prev.leftIrisRel.x,
      y: a * curr.leftIrisRel.y + b * prev.leftIrisRel.y,
    },
    rightIrisRel: {
      x: a * curr.rightIrisRel.x + b * prev.rightIrisRel.x,
      y: a * curr.rightIrisRel.y + b * prev.rightIrisRel.y,
    },
    leftEyeOpenness: a * curr.leftEyeOpenness + b * prev.leftEyeOpenness,
    rightEyeOpenness: a * curr.rightEyeOpenness + b * prev.rightEyeOpenness,
    headPose: {
      yaw: a * curr.headPose.yaw + b * prev.headPose.yaw,
      pitch: a * curr.headPose.pitch + b * prev.headPose.pitch,
    },
    timestamp: curr.timestamp,
  }
}
