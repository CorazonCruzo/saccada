import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EyeTracker } from './EyeTracker'

// Mock webgazer module
const mockWebgazer = {
  params: { videoViewerWidth: 320, videoViewerHeight: 240 },
  showVideoPreview: vi.fn().mockReturnThis(),
  showPredictionPoints: vi.fn().mockReturnThis(),
  showFaceOverlay: vi.fn().mockReturnThis(),
  showFaceFeedbackBox: vi.fn().mockReturnThis(),
  applyKalmanFilter: vi.fn().mockReturnThis(),
  setRegression: vi.fn().mockReturnThis(),
  saveDataAcrossSessions: vi.fn().mockReturnThis(),
  removeMouseEventListeners: vi.fn().mockReturnThis(),
  setGazeListener: vi.fn().mockReturnThis(),
  begin: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn().mockReturnThis(),
  resume: vi.fn().mockResolvedValue(undefined),
  end: vi.fn(),
  removeGazeListener: vi.fn(),
  recordScreenPosition: vi.fn(),
  clearData: vi.fn(),
  getCurrentPrediction: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
}

vi.mock('webgazer', () => ({ default: mockWebgazer }))

beforeEach(() => {
  vi.clearAllMocks()
  document.body.innerHTML = ''
  // Clean up guard styles injected into <head> by previous tests
  document.head.querySelectorAll('style').forEach(s => s.remove())
})

describe('EyeTracker', () => {
  describe('start()', () => {
    it('initializes webgazer on first call', async () => {
      const tracker = new EyeTracker()
      const cb = vi.fn()
      await tracker.start(cb)

      expect(mockWebgazer.setRegression).toHaveBeenCalledWith('ridge')
      expect(mockWebgazer.applyKalmanFilter).toHaveBeenCalledWith(false)
      expect(mockWebgazer.saveDataAcrossSessions).toHaveBeenCalledWith(true)
      expect(mockWebgazer.removeMouseEventListeners).toHaveBeenCalled()
      expect(mockWebgazer.setGazeListener).toHaveBeenCalled()
      expect(mockWebgazer.begin).toHaveBeenCalledTimes(1)
      expect(tracker.isReady()).toBe(true)
      expect(tracker.isRunning()).toBe(true)
    })

    it('does not call begin() on subsequent calls', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      mockWebgazer.begin.mockClear()

      await tracker.start(vi.fn())
      expect(mockWebgazer.begin).not.toHaveBeenCalled()
    })

    it('sets running to true on subsequent calls', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.setRunning(false)
      expect(tracker.isRunning()).toBe(false)

      await tracker.start(vi.fn())
      expect(tracker.isRunning()).toBe(true)
    })
  })

  describe('setRunning()', () => {
    it('toggles running state', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      tracker.setRunning(false)
      expect(tracker.isRunning()).toBe(false)

      tracker.setRunning(true)
      expect(tracker.isRunning()).toBe(true)
    })
  })

  describe('gaze listener throttling', () => {
    it('throttles callbacks to ~15fps', async () => {
      const tracker = new EyeTracker()
      const cb = vi.fn()
      await tracker.start(cb)

      // Get the listener that was registered with WebGazer
      const gazeListener = mockWebgazer.setGazeListener.mock.calls[0][0]

      // First call should go through
      gazeListener({ x: 10, y: 20 }, 100)
      expect(cb).toHaveBeenCalledTimes(1)

      // Immediate second call should be throttled
      gazeListener({ x: 30, y: 40 }, 110)
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('skips callback when data is null', async () => {
      const tracker = new EyeTracker()
      const cb = vi.fn()
      await tracker.start(cb)

      const gazeListener = mockWebgazer.setGazeListener.mock.calls[0][0]
      gazeListener(null, 100)
      expect(cb).not.toHaveBeenCalled()
    })

    it('skips callback when not running', async () => {
      const tracker = new EyeTracker()
      const cb = vi.fn()
      await tracker.start(cb)
      tracker.setRunning(false)

      const gazeListener = mockWebgazer.setGazeListener.mock.calls[0][0]
      gazeListener({ x: 10, y: 20 }, 100)
      expect(cb).not.toHaveBeenCalled()
    })
  })

  describe('showVideo()', () => {
    it('does nothing if webgazer not loaded', () => {
      const tracker = new EyeTracker()
      // Should not throw
      tracker.showVideo(true)
    })

    it('sets container visible with proper positioning', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.showVideo(true)

      expect(container.style.display).toBe('block')
      expect(container.style.opacity).toBe('1')
      expect(container.style.right).toBe('10px')
      expect(container.style.zIndex).toBe('50')
    })

    it('injects CSS guard that keeps video display:block and opacity:0', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      // CSS guard prevents WebGazer from setting display:none on video.
      // Video stays display:block with opacity:0 — invisible to user but
      // non-zero dimensions for MediaPipe GPU pipeline.
      const styles = document.head.querySelectorAll('style')
      const guardContent = Array.from(styles).map(s => s.textContent).join('')
      expect(guardContent).toContain('#webgazerVideoFeed{display:block!important;opacity:0!important}')
    })

    it('hides container with opacity 0 but keeps display block (prevents WASM crash)', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.showVideo(false)

      // Must be display:block, not display:none!
      // display:none causes zero-size WebGL framebuffer → MediaPipe WASM abort.
      expect(container.style.display).toBe('block')
      expect(container.style.opacity).toBe('0')
      expect(container.style.zIndex).toBe('-1')
    })
  })

  describe('recordCalibrationPoint()', () => {
    it('calls webgazer.recordScreenPosition', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.recordCalibrationPoint(100, 200)

      expect(mockWebgazer.recordScreenPosition).toHaveBeenCalledWith(100, 200, 'click')
    })

    it('does nothing if webgazer not loaded', () => {
      const tracker = new EyeTracker()
      tracker.recordCalibrationPoint(100, 200)
      expect(mockWebgazer.recordScreenPosition).not.toHaveBeenCalled()
    })
  })

  describe('clearData()', () => {
    it('calls webgazer.clearData', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.clearData()

      expect(mockWebgazer.clearData).toHaveBeenCalled()
    })
  })

  describe('predict()', () => {
    it('returns prediction when ready', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      const result = await tracker.predict()

      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('returns null when not ready', async () => {
      const tracker = new EyeTracker()
      const result = await tracker.predict()

      expect(result).toBeNull()
    })
  })

  describe('sleep()', () => {
    it('stops running and clears callback', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      tracker.sleep()

      expect(tracker.isRunning()).toBe(false)
      expect(tracker.isReady()).toBe(true) // still ready for reuse
    })

    it('pauses WebGazer prediction loop before stopping camera', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      tracker.sleep()

      // pause() must be called to stop estimateFaces() from processing
      // dead frames after camera tracks are stopped
      expect(mockWebgazer.pause).toHaveBeenCalled()
    })

    it('stops camera tracks', async () => {
      const stopFn = vi.fn()
      const videoEl = document.createElement('video')
      videoEl.id = 'webgazerVideoFeed'
      Object.defineProperty(videoEl, 'srcObject', {
        value: { getTracks: () => [{ stop: stopFn }, { stop: stopFn }] },
        writable: true,
      })
      document.body.appendChild(videoEl)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.sleep()

      expect(stopFn).toHaveBeenCalledTimes(2)
    })

    it('hides video container (opacity 0, not display none)', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      container.style.display = 'block'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.sleep()

      expect(container.style.display).toBe('block')
      expect(container.style.opacity).toBe('0')
    })
  })

  describe('start() after sleep()', () => {
    it('re-acquires camera, waits for loadeddata, then resumes', async () => {
      const mockStream = { id: 'new-stream' }
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        writable: true,
        configurable: true,
      })

      const videoEl = document.createElement('video')
      videoEl.id = 'webgazerVideoFeed'
      const stopFn = vi.fn()
      // Simulate browser behavior: setting srcObject fires loadeddata
      // asynchronously once the stream's first frame is decoded.
      let _srcObject: unknown = { getTracks: () => [{ stop: stopFn }] }
      Object.defineProperty(videoEl, 'srcObject', {
        get() { return _srcObject },
        set(v) {
          _srcObject = v
          // Fire loadeddata on next microtask (like a real browser)
          Promise.resolve().then(() =>
            videoEl.dispatchEvent(new Event('loadeddata'))
          )
        },
        configurable: true,
      })
      document.body.appendChild(videoEl)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.sleep()
      mockWebgazer.resume.mockClear()

      await tracker.start(vi.fn())

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'user' },
      })
      // resume() must be called AFTER camera stream has decoded its first frame
      expect(mockWebgazer.resume).toHaveBeenCalled()
      expect(tracker.isRunning()).toBe(true)
    })
  })

  describe('showVideo(false) keeps container in layout', () => {
    it('never uses display:none — sets opacity 0 to prevent WASM framebuffer crash', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      // Show then hide — simulates calibration → instructions transition
      tracker.showVideo(true)
      expect(container.style.opacity).toBe('1')

      tracker.showVideo(false)
      expect(container.style.display).toBe('block')
      expect(container.style.opacity).toBe('0')
    })

    it('hides leftover container when called before calibration begins', async () => {
      // Simulates: previous session left the container visible,
      // CalibrationPage mounts and calls showVideo(false) on init.
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      container.style.display = 'block'
      container.style.opacity = '0.85'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.showVideo(false)

      expect(container.style.opacity).toBe('0')
      expect(container.style.zIndex).toBe('-1')
      expect(container.style.display).toBe('block')
    })

    it('never calls showVideoPreview — prevents Chrome display:none WASM crash', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      mockWebgazer.showVideoPreview.mockClear()

      // showVideoPreview triggers hideVideoElement() which sets
      // display:none on Chrome → MediaPipe WASM crash. Must never be called.
      tracker.showVideo(false)
      expect(mockWebgazer.showVideoPreview).not.toHaveBeenCalled()

      tracker.showVideo(true)
      expect(mockWebgazer.showVideoPreview).not.toHaveBeenCalled()
    })

    it('toggles face overlay via WebGazer API but never shows feedback box', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      mockWebgazer.showFaceOverlay.mockClear()
      mockWebgazer.showFaceFeedbackBox.mockClear()

      tracker.showVideo(true)
      expect(mockWebgazer.showFaceOverlay).toHaveBeenCalledWith(true)
      // Feedback box is never toggled in showVideo — always off (no border artifact)
      expect(mockWebgazer.showFaceFeedbackBox).not.toHaveBeenCalled()

      tracker.showVideo(false)
      expect(mockWebgazer.showFaceOverlay).toHaveBeenCalledWith(false)
    })

    it('does not set inline styles on video or canvas elements', async () => {
      const container = document.createElement('div')
      container.id = 'webgazerVideoContainer'
      const video = document.createElement('video')
      video.id = 'webgazerVideoFeed'
      const canvas = document.createElement('canvas')
      canvas.id = 'webgazerVideoCanvas'
      canvas.style.display = 'none' // WebGazer hides this intentionally
      container.appendChild(video)
      container.appendChild(canvas)
      document.body.appendChild(container)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      tracker.showVideo(false)
      // showVideo() must not touch video inline styles — CSS guard handles it
      expect(video.style.display).toBe('')
      // Canvas elements must NOT be overridden — WebGazer manages them
      expect(canvas.style.display).toBe('none')
    })
  })

  describe('CSS guard (WASM crash prevention)', () => {
    it('injects guard stylesheet into <head> during start()', async () => {
      expect(document.head.querySelectorAll('style').length).toBe(0)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      const styles = document.head.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].textContent).toContain('#webgazerVideoFeed{display:block!important;opacity:0!important}')
      expect(styles[0].textContent).toContain('#webgazerVideoContainer{display:block!important')
    })

    it('guard keeps container display:block!important to prevent WASM crash', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      const guardContent = document.head.querySelector('style')!.textContent!
      // Container must also be display:block!important — WebGazer's hideVideoElement
      // can cascade display:none to the container via showVideoPreview(false)
      expect(guardContent).toContain('#webgazerVideoContainer{display:block!important')
    })
  })

  describe('destroy()', () => {
    it('calls end() and removes DOM elements', async () => {
      for (const id of [
        'webgazerVideoFeed', 'webgazerVideoCanvas',
        'webgazerFaceOverlay', 'webgazerFaceFeedbackBox',
        'webgazerGazeDot', 'webgazerVideoContainer',
      ]) {
        const el = document.createElement('div')
        el.id = id
        document.body.appendChild(el)
      }

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      tracker.destroy()

      expect(mockWebgazer.removeGazeListener).toHaveBeenCalled()
      expect(mockWebgazer.end).toHaveBeenCalled()
      expect(tracker.isReady()).toBe(false)
      expect(tracker.isRunning()).toBe(false)

      for (const id of [
        'webgazerVideoFeed', 'webgazerVideoContainer',
      ]) {
        expect(document.getElementById(id)).toBeNull()
      }
    })

    it('removes guard stylesheet from <head>', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())
      expect(document.head.querySelectorAll('style').length).toBe(1)

      tracker.destroy()
      expect(document.head.querySelectorAll('style').length).toBe(0)
    })

    it('does nothing if webgazer not loaded', () => {
      const tracker = new EyeTracker()
      // Should not throw
      tracker.destroy()
      expect(mockWebgazer.end).not.toHaveBeenCalled()
    })
  })
})
