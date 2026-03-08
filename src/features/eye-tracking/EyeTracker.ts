export interface GazePoint {
  x: number
  y: number
  t: number
}

type GazeCallback = (point: GazePoint) => void

/**
 * WebGazer wrapper. Plain TypeScript class (not a hook).
 * Lazy-loads the webgazer module (~5MB) only when needed.
 *
 * MediaPipe WASM cannot survive end()/pause()/srcObject=null.
 * So camera lifecycle works like this:
 *   start()       — first call: full init + begin(). Later calls: re-acquire camera if needed.
 *   sleep()       — stop camera tracks (LED off), hide video. Prediction loop runs on frozen frame.
 *   start() again — re-acquire camera via getUserMedia, feed new stream to video element.
 *   destroy()     — page unload only.
 */
export class EyeTracker {
  private webgazer: typeof import('webgazer').default | null = null
  private callback: GazeCallback | null = null
  private ready = false
  private running = false
  private cameraLive = false
  private lastEmit = 0
  private throttleMs = 66 // ~15fps

  async load(): Promise<void> {
    if (this.webgazer) return
    const mod = await import('webgazer')
    this.webgazer = mod.default
  }

  /**
   * Start webcam + gaze prediction.
   * First call: full init with begin().
   * After sleep(): re-acquires camera and resumes.
   */
  async start(onGaze: GazeCallback): Promise<void> {
    await this.load()
    const wg = this.webgazer!
    this.callback = onGaze

    if (this.ready) {
      // Already initialized: re-acquire camera if it was stopped
      if (!this.cameraLive) {
        await this.reacquireCamera()
      }
      this.running = true
      return
    }

    // First-time initialization
    try { wg.showVideoPreview(true) } catch { /* noop */ }
    try { wg.showPredictionPoints(false) } catch { /* noop */ }
    try { wg.showFaceOverlay(true) } catch { /* noop */ }
    try { wg.showFaceFeedbackBox(true) } catch { /* noop */ }
    try { wg.applyKalmanFilter(false) } catch { /* noop */ }
    try { wg.setRegression('ridge') } catch { /* noop */ }
    try { wg.saveDataAcrossSessions(true) } catch { /* noop */ }
    try { wg.removeMouseEventListeners() } catch { /* noop */ }

    wg.setGazeListener((data, elapsedTime) => {
      if (!data || !this.running) return
      const now = performance.now()
      if (now - this.lastEmit < this.throttleMs) return
      this.lastEmit = now
      this.callback?.({ x: data.x, y: data.y, t: elapsedTime })
    })

    await wg.begin()
    this.showVideo(false)
    this.ready = true
    this.running = true
    this.cameraLive = true
  }

  /** Pause gaze processing (camera stays on) */
  setRunning(value: boolean): void {
    this.running = value
  }

  /** Show or hide the webcam video preview with face mesh overlay */
  showVideo(visible: boolean): void {
    if (!this.webgazer) return
    try { this.webgazer.showVideoPreview(visible) } catch { /* noop */ }
    try { this.webgazer.showFaceOverlay(visible) } catch { /* noop */ }
    try { this.webgazer.showFaceFeedbackBox(visible) } catch { /* noop */ }
    const container = document.getElementById('webgazerVideoContainer')
    if (container) {
      container.style.display = visible ? 'block' : 'none'
      if (visible) {
        container.style.position = 'fixed'
        container.style.top = '20%'
        container.style.right = '20px'
        container.style.left = 'auto'
        container.style.transform = 'none'
        container.style.bottom = 'auto'
        container.style.width = '400px'
        container.style.height = '300px'
        container.style.zIndex = '0'
        container.style.pointerEvents = 'none'
        container.style.opacity = '0.85'
        container.style.borderRadius = '12px'
        container.style.overflow = 'hidden'
        for (const el of container.querySelectorAll('video, canvas')) {
          const h = el as HTMLElement
          h.style.width = '100%'
          h.style.height = '100%'
          h.style.objectFit = 'cover'
        }
      }
    }
  }

  recordCalibrationPoint(x: number, y: number): void {
    if (!this.webgazer) return
    this.webgazer.recordScreenPosition(x, y, 'click')
  }

  clearData(): void {
    if (!this.webgazer) return
    try { this.webgazer.clearData() } catch { /* noop */ }
  }

  async predict(): Promise<{ x: number; y: number } | null> {
    if (!this.webgazer || !this.ready) return null
    return this.webgazer.getCurrentPrediction()
  }

  isReady(): boolean { return this.ready }
  isRunning(): boolean { return this.running }

  /**
   * Stop camera (LED off), hide video, stop gaze processing.
   * WebGazer's prediction loop keeps running on a frozen frame (no WASM crash).
   * Call start() to re-acquire camera for the next session.
   */
  sleep(): void {
    this.running = false
    this.callback = null
    this.showVideo(false)
    this.stopCameraTracks()
  }

  /**
   * Hard cleanup: page unload only.
   * After this, WebGazer cannot be restarted (WASM limitation).
   */
  destroy(): void {
    if (!this.webgazer) return
    this.running = false
    this.ready = false
    this.callback = null
    this.cameraLive = false
    try { this.webgazer.removeGazeListener() } catch { /* noop */ }
    try { this.webgazer.end() } catch { /* noop */ }
    for (const id of [
      'webgazerVideoFeed', 'webgazerVideoCanvas',
      'webgazerFaceOverlay', 'webgazerFaceFeedbackBox',
      'webgazerGazeDot', 'webgazerVideoContainer',
    ]) {
      document.getElementById(id)?.remove()
    }
    this.webgazer = null
  }

  /**
   * Stop camera tracks directly. The video element keeps its srcObject
   * (frozen last frame), so the prediction loop doesn't crash.
   */
  private stopCameraTracks(): void {
    const video = document.getElementById('webgazerVideoFeed') as HTMLVideoElement | null
    if (!video?.srcObject) return
    for (const track of (video.srcObject as MediaStream).getTracks()) {
      track.stop()
    }
    this.cameraLive = false
  }

  /**
   * Re-acquire camera and plug the new stream into WebGazer's existing
   * video element. No begin() call needed: prediction loop is still alive.
   */
  private async reacquireCamera(): Promise<void> {
    const video = document.getElementById('webgazerVideoFeed') as HTMLVideoElement | null
    if (!video) return
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
    })
    video.srcObject = stream
    this.cameraLive = true
  }
}
