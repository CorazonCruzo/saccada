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
 * WebGazer wrapper. Plain TypeScript class (not a hook).
 * Lazy-loads the webgazer module (~5MB) only when needed.
 *
 * MediaPipe WASM cannot survive end() or srcObject=null.
 * So camera lifecycle works like this:
 *   start()       — first call: full init + begin(). Later calls: re-acquire camera + resume loop.
 *   sleep()       — pause prediction loop, stop camera tracks (LED off), hide video.
 *   start() again — re-acquire camera via getUserMedia, resume prediction loop.
 *   destroy()     — page unload only.
 *
 * Critical: sleep() must pause WebGazer's prediction loop BEFORE stopping
 * camera tracks. Otherwise estimateFaces() processes frozen/dead frames,
 * causing GL_INVALID_FRAMEBUFFER_OPERATION and killing the loop permanently.
 */
export class EyeTracker {
  private webgazer: typeof import('webgazer').default | null = null
  private callback: GazeCallback | null = null
  private ready = false
  private running = false
  private cameraLive = false
  private lastEmit = 0
  private throttleMs = 66 // ~15fps
  private guardStyle: HTMLStyleElement | null = null

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
      // Already initialized: re-acquire camera and resume prediction loop
      if (!this.cameraLive) {
        await this.reacquireCamera()
      }
      // Resume WebGazer's prediction loop (stopped by sleep → pause).
      // Must happen AFTER camera is live so estimateFaces() gets valid frames.
      try { await wg.resume() } catch { /* noop — loop may already be running */ }
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
    try { wg.showFaceFeedbackBox(false) } catch { /* noop */ }
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

    // --- WASM crash prevention (permanent CSS guard) ---
    //
    // WebGazer's init() calls hideVideoElement() which on Chrome sets
    // display:none on the <video>. Then loop() processes the FIRST frame
    // while the video has zero rendered dimensions. MediaPipe's
    // estimateFaces(video) passes this zero-size element to the GPU
    // pipeline, causing GL_INVALID_FRAMEBUFFER_OPERATION.
    //
    // Fix: inject !important rules BEFORE begin() that override any
    // inline display:none WebGazer sets. The video stays display:block
    // with opacity:0 at all times — invisible to the user but with
    // non-zero dimensions for the GPU pipeline.
    //
    // The container rule hides the flash at (0,0) during init.
    // showVideo() overrides container opacity via inline styles
    // (no !important on container opacity, so inline wins).
    this.guardStyle = document.createElement('style')
    this.guardStyle.textContent = [
      '#webgazerVideoFeed{display:block!important;opacity:0!important}',
      '#webgazerVideoContainer{display:block!important;opacity:0;position:fixed!important}',
    ].join('')
    document.head.appendChild(this.guardStyle)

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

  /**
   * Show or hide the webcam face mesh overlay.
   *
   * The raw camera feed is NEVER shown to the user. Only the face mesh
   * overlay canvas is visible. The <video> element stays in layout
   * (display:block, opacity:0) so MediaPipe WASM always has non-zero
   * dimensions and can read video frames without crashing.
   *
   * We never call WebGazer's showVideoPreview(false) or showVideo(false)
   * because on Chrome they use `display: none`, which zeros the video
   * dimensions and causes GL_INVALID_FRAMEBUFFER_OPERATION.
   *
   * We use opacity:0 (not visibility:hidden) on the video because
   * Safari/Firefox WebGazer does the same and MediaPipe's GPU pipeline
   * is known to work with it.
   */
  showVideo(visible: boolean): void {
    if (!this.webgazer) return

    // Toggle face mesh overlay. Feedback box is always off (no border artifact).
    try { this.webgazer.showFaceOverlay(visible) } catch { /* noop */ }

    const container = document.getElementById('webgazerVideoContainer')
    if (container) {
      container.style.display = 'block'
      container.style.position = 'fixed'
      container.style.pointerEvents = 'none'
      container.style.overflow = 'hidden'
      container.style.borderRadius = '8px'

      if (visible) {
        // Center on screen, shifted up ~5% so the nose bridge on the face
        // mesh aligns with the center calibration dot.
        container.style.top = '50%'
        container.style.left = '50%'
        container.style.right = 'auto'
        container.style.transform = 'translate(-50%, -55%)'
        container.style.bottom = 'auto'
        container.style.zIndex = '50'
        container.style.opacity = '1'
      } else {
        container.style.top = '0'
        container.style.left = '0'
        container.style.right = 'auto'
        container.style.transform = 'none'
        container.style.zIndex = '-1'
        container.style.opacity = '0'
      }

      // Video element is permanently guarded by CSS !important rules:
      // display:block!important; opacity:0!important
      // No manual style overrides needed here.
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
   * Pauses WebGazer's prediction loop to prevent estimateFaces() from
   * processing frozen/dead frames (which causes WASM crash).
   * Call start() to re-acquire camera and resume for the next session.
   */
  sleep(): void {
    this.running = false
    this.callback = null
    // Pause prediction loop BEFORE stopping camera tracks.
    // If we stop tracks first, loop() calls estimateFaces() on a dead
    // video frame → GL_INVALID_FRAMEBUFFER_OPERATION → WASM abort.
    if (this.webgazer) {
      try { this.webgazer.pause() } catch { /* noop */ }
    }
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
    this.guardStyle?.remove()
    this.guardStyle = null
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
   * (frozen last frame). Prediction loop must be paused BEFORE calling
   * this to prevent estimateFaces() from crashing on dead frames.
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
   * video element. No begin() call needed. Caller must resume the
   * prediction loop after this returns.
   */
  private async reacquireCamera(): Promise<void> {
    const video = document.getElementById('webgazerVideoFeed') as HTMLVideoElement | null
    if (!video) return
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
    })
    video.srcObject = stream
    // Wait for the new stream to decode its first frame.
    // Without this, resume() → loop() → estimateFaces(video) runs while
    // videoWidth/videoHeight are still 0 → zero-size WebGL texture →
    // GL_INVALID_FRAMEBUFFER_OPERATION → WASM abort.
    // This mirrors what WebGazer's own init() does before starting loop().
    if (!video.videoWidth) {
      await new Promise<void>((resolve) => {
        video.addEventListener('loadeddata', () => resolve(), { once: true })
      })
    }
    this.cameraLive = true
  }
}
