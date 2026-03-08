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
    // Larger preview for better face visibility during calibration.
    // Must be set BEFORE begin() — init() reads these to size all elements.
    wg.params.videoViewerWidth = 480
    wg.params.videoViewerHeight = 360
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

    // Prevent flash: WebGazer's init() creates the container at (0,0)
    // and it would be visible for 1-2 frames before showVideo(false) runs.
    // Temporary CSS rule hides it instantly. Uses opacity (not display:none)
    // to keep non-zero dimensions for MediaPipe WASM.
    const antiFlashStyle = document.createElement('style')
    antiFlashStyle.textContent = '#webgazerVideoContainer{opacity:0!important}'
    document.head.appendChild(antiFlashStyle)

    await wg.begin()
    this.showVideo(false)
    antiFlashStyle.remove()
    this.ready = true
    this.running = true
    this.cameraLive = true
  }

  /** Pause gaze processing (camera stays on) */
  setRunning(value: boolean): void {
    this.running = value
  }

  /**
   * Show or hide the webcam face mesh overlay.
   *
   * The raw camera feed is NEVER shown to the user. Only the face mesh
   * overlay and feedback box are visible. The <video> element stays in
   * layout (display:block, visibility:hidden) so MediaPipe WASM always
   * has non-zero dimensions and doesn't crash.
   *
   * We never call WebGazer's showVideoPreview(false) or showVideo(false)
   * because on Chrome they use `display: none`, which zeros the video
   * dimensions and causes GL_INVALID_FRAMEBUFFER_OPERATION.
   */
  showVideo(visible: boolean): void {
    if (!this.webgazer) return

    // Show/hide overlay canvases via WebGazer API.
    // Face overlay and feedback box use display:none which is fine for canvases.
    try { this.webgazer.showFaceOverlay(visible) } catch { /* noop */ }
    try { this.webgazer.showFaceFeedbackBox(visible) } catch { /* noop */ }

    const container = document.getElementById('webgazerVideoContainer')
    if (container) {
      container.style.display = 'block'
      container.style.position = 'fixed'
      container.style.pointerEvents = 'none'
      container.style.overflow = 'hidden'
      container.style.borderRadius = '8px'

      if (visible) {
        container.style.top = '10px'
        container.style.right = '10px'
        container.style.left = 'auto'
        container.style.transform = 'none'
        container.style.bottom = 'auto'
        container.style.zIndex = '50'
        container.style.opacity = '1'
      } else {
        container.style.top = '0'
        container.style.left = '0'
        container.style.right = 'auto'
        container.style.zIndex = '-1'
        container.style.opacity = '0'
      }

      // Video element: always display:block (WASM crash prevention)
      // but visibility:hidden so the raw camera feed is never shown.
      // The face overlay canvas is drawn on top independently.
      const video = container.querySelector('video') as HTMLElement | null
      if (video) {
        video.style.display = 'block'
        video.style.visibility = 'hidden'
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

  /**
   * Persist calibration data to localforage so it survives page refresh.
   *
   * WebGazer normally saves via its clickListener, but we call
   * removeMouseEventListeners() to prevent unwanted calibration from
   * mouse clicks. So we trigger the save manually after calibration.
   *
   * On the next begin(), WebGazer's loadGlobalData() picks this up.
   */
  async saveCalibration(): Promise<void> {
    if (!this.webgazer) return
    try {
      const regs = this.webgazer.getRegression()
      if (!regs || !regs[0]) return
      const data = regs[0].getData()
      if (!data) return
      const localforage = (await import('localforage')).default
      await localforage.setItem('webgazerGlobalData', data)
    } catch {
      // localforage or regression API unavailable — non-fatal
    }
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
