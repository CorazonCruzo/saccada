import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EyeTracker } from './EyeTracker'
import type { EyeFeatures } from './mediapipe/types'

// Mock the GazePipeline
const mockPipeline = {
  isReady: vi.fn().mockReturnValue(false),
  isRunning: vi.fn().mockReturnValue(false),
  isCalibrated: vi.fn().mockReturnValue(false),
  start: vi.fn().mockResolvedValue(undefined),
  setRunning: vi.fn(),
  showVideo: vi.fn(),
  captureCalibrationSample: vi.fn().mockReturnValue(null),
  addCalibrationPoint: vi.fn(),
  trainCalibration: vi.fn().mockReturnValue({ accuracyPx: 50 }),
  clearCalibration: vi.fn(),
  saveCalibration: vi.fn().mockResolvedValue(undefined),
  loadCalibration: vi.fn(),
  predict: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
  isFaceDetected: vi.fn().mockReturnValue(false),
  setLandmarkCallback: vi.fn(),
  sleep: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('./mediapipe/pipeline', () => ({
  GazePipeline: class { constructor() { return mockPipeline as unknown } },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockPipeline.isReady.mockReturnValue(false)
  mockPipeline.isRunning.mockReturnValue(false)
  mockPipeline.isCalibrated.mockReturnValue(false)
  mockPipeline.captureCalibrationSample.mockReturnValue(null)
  mockPipeline.predict.mockResolvedValue({ x: 100, y: 200 })
})

function makeSample(overrides?: Partial<EyeFeatures>): EyeFeatures {
  return {
    leftIris: { x: 0.4, y: 0.5 },
    rightIris: { x: 0.6, y: 0.5 },
    leftIrisRel: { x: 0, y: 0 },
    rightIrisRel: { x: 0, y: 0 },
    leftEyeOpenness: 0.3,
    rightEyeOpenness: 0.3,
    headPose: { yaw: 0, pitch: 0 },
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('EyeTracker', () => {
  describe('start()', () => {
    it('loads saved calibration on first start if not ready and not calibrated', async () => {
      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      expect(mockPipeline.loadCalibration).toHaveBeenCalled()
      expect(mockPipeline.start).toHaveBeenCalled()
    })

    it('does not load calibration if pipeline is already ready', async () => {
      mockPipeline.isReady.mockReturnValue(true)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      expect(mockPipeline.loadCalibration).not.toHaveBeenCalled()
    })

    it('does not load calibration if pipeline is already calibrated', async () => {
      mockPipeline.isCalibrated.mockReturnValue(true)

      const tracker = new EyeTracker()
      await tracker.start(vi.fn())

      expect(mockPipeline.loadCalibration).not.toHaveBeenCalled()
    })

    it('passes gaze callback to pipeline.start()', async () => {
      const cb = vi.fn()
      const tracker = new EyeTracker()
      await tracker.start(cb)

      expect(mockPipeline.start).toHaveBeenCalledWith(cb)
    })
  })

  describe('setRunning()', () => {
    it('delegates to pipeline', () => {
      const tracker = new EyeTracker()
      tracker.setRunning(false)
      expect(mockPipeline.setRunning).toHaveBeenCalledWith(false)

      tracker.setRunning(true)
      expect(mockPipeline.setRunning).toHaveBeenCalledWith(true)
    })
  })

  describe('showVideo()', () => {
    it('delegates to pipeline', () => {
      const tracker = new EyeTracker()
      tracker.showVideo(true)
      expect(mockPipeline.showVideo).toHaveBeenCalledWith(true)

      tracker.showVideo(false)
      expect(mockPipeline.showVideo).toHaveBeenCalledWith(false)
    })
  })

  describe('recordCalibrationPoint()', () => {
    it('returns true when sample is captured', () => {
      const sample = makeSample()
      mockPipeline.captureCalibrationSample.mockReturnValue(sample)

      const tracker = new EyeTracker()
      const result = tracker.recordCalibrationPoint(100, 200)

      expect(result).toBe(true)
      expect(mockPipeline.captureCalibrationSample).toHaveBeenCalled()
    })

    it('returns false when captureCalibrationSample returns null', () => {
      mockPipeline.captureCalibrationSample.mockReturnValue(null)

      const tracker = new EyeTracker()
      const result = tracker.recordCalibrationPoint(100, 200)

      expect(result).toBe(false)
    })

    it('filters out blink samples (low eye openness)', () => {
      const blink = makeSample({ leftEyeOpenness: 0.05, rightEyeOpenness: 0.1 })
      mockPipeline.captureCalibrationSample.mockReturnValue(blink)

      const tracker = new EyeTracker()
      const result = tracker.recordCalibrationPoint(100, 200)

      expect(result).toBe(false)
    })

    it('accepts samples with normal eye openness', () => {
      const open = makeSample({ leftEyeOpenness: 0.3, rightEyeOpenness: 0.35 })
      mockPipeline.captureCalibrationSample.mockReturnValue(open)

      const tracker = new EyeTracker()
      const result = tracker.recordCalibrationPoint(100, 200)

      expect(result).toBe(true)
    })
  })

  describe('finalizeCalibrationPoint()', () => {
    it('sends accumulated samples to pipeline.addCalibrationPoint', () => {
      const sample1 = makeSample()
      const sample2 = makeSample({ timestamp: Date.now() + 100 })
      mockPipeline.captureCalibrationSample
        .mockReturnValueOnce(sample1)
        .mockReturnValueOnce(sample2)

      const tracker = new EyeTracker()
      tracker.recordCalibrationPoint(100, 200)
      tracker.recordCalibrationPoint(100, 200)
      tracker.finalizeCalibrationPoint(100, 200)

      expect(mockPipeline.addCalibrationPoint).toHaveBeenCalledWith(
        100, 200, [sample1, sample2]
      )
    })

    it('does nothing if no samples were accumulated', () => {
      const tracker = new EyeTracker()
      tracker.finalizeCalibrationPoint(100, 200)

      expect(mockPipeline.addCalibrationPoint).not.toHaveBeenCalled()
    })

    it('clears accumulated samples after finalization', () => {
      const sample = makeSample()
      mockPipeline.captureCalibrationSample.mockReturnValue(sample)

      const tracker = new EyeTracker()
      tracker.recordCalibrationPoint(100, 200)
      tracker.finalizeCalibrationPoint(100, 200)
      mockPipeline.addCalibrationPoint.mockClear()

      // Second finalize without new samples should not call addCalibrationPoint
      tracker.finalizeCalibrationPoint(200, 300)
      expect(mockPipeline.addCalibrationPoint).not.toHaveBeenCalled()
    })
  })

  describe('trainCalibration()', () => {
    it('delegates to pipeline and returns result', () => {
      mockPipeline.trainCalibration.mockReturnValue({ accuracyPx: 42 })

      const tracker = new EyeTracker()
      const result = tracker.trainCalibration()

      expect(result).toEqual({ accuracyPx: 42 })
      expect(mockPipeline.trainCalibration).toHaveBeenCalled()
    })
  })

  describe('clearData()', () => {
    it('clears pipeline calibration and internal samples', () => {
      const sample = makeSample()
      mockPipeline.captureCalibrationSample.mockReturnValue(sample)

      const tracker = new EyeTracker()
      tracker.recordCalibrationPoint(100, 200)
      tracker.clearData()

      expect(mockPipeline.clearCalibration).toHaveBeenCalled()

      // After clearData, finalizeCalibrationPoint should have no samples
      tracker.finalizeCalibrationPoint(100, 200)
      expect(mockPipeline.addCalibrationPoint).not.toHaveBeenCalled()
    })
  })

  describe('saveCalibration()', () => {
    it('delegates to pipeline', async () => {
      const tracker = new EyeTracker()
      await tracker.saveCalibration()

      expect(mockPipeline.saveCalibration).toHaveBeenCalled()
    })
  })

  describe('predict()', () => {
    it('returns prediction from pipeline', async () => {
      const tracker = new EyeTracker()
      const result = await tracker.predict()

      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('returns null when pipeline returns null', async () => {
      mockPipeline.predict.mockResolvedValue(null)

      const tracker = new EyeTracker()
      const result = await tracker.predict()

      expect(result).toBeNull()
    })
  })

  describe('isReady()', () => {
    it('delegates to pipeline', () => {
      mockPipeline.isReady.mockReturnValue(true)
      const tracker = new EyeTracker()
      expect(tracker.isReady()).toBe(true)

      mockPipeline.isReady.mockReturnValue(false)
      expect(tracker.isReady()).toBe(false)
    })
  })

  describe('isRunning()', () => {
    it('delegates to pipeline', () => {
      mockPipeline.isRunning.mockReturnValue(true)
      const tracker = new EyeTracker()
      expect(tracker.isRunning()).toBe(true)
    })
  })

  describe('isCalibrated()', () => {
    it('delegates to pipeline', () => {
      mockPipeline.isCalibrated.mockReturnValue(true)
      const tracker = new EyeTracker()
      expect(tracker.isCalibrated()).toBe(true)

      mockPipeline.isCalibrated.mockReturnValue(false)
      expect(tracker.isCalibrated()).toBe(false)
    })
  })

  describe('isFaceDetected()', () => {
    it('delegates to pipeline', () => {
      mockPipeline.isFaceDetected.mockReturnValue(true)
      const tracker = new EyeTracker()
      expect(tracker.isFaceDetected()).toBe(true)

      mockPipeline.isFaceDetected.mockReturnValue(false)
      expect(tracker.isFaceDetected()).toBe(false)
    })
  })

  describe('setLandmarkCallback()', () => {
    it('delegates to pipeline', () => {
      const cb = vi.fn()
      const tracker = new EyeTracker()
      tracker.setLandmarkCallback(cb)
      expect(mockPipeline.setLandmarkCallback).toHaveBeenCalledWith(cb)
    })

    it('accepts null to unsubscribe', () => {
      const tracker = new EyeTracker()
      tracker.setLandmarkCallback(null)
      expect(mockPipeline.setLandmarkCallback).toHaveBeenCalledWith(null)
    })
  })

  describe('sleep()', () => {
    it('delegates to pipeline', () => {
      const tracker = new EyeTracker()
      tracker.sleep()

      expect(mockPipeline.sleep).toHaveBeenCalled()
    })
  })

  describe('destroy()', () => {
    it('delegates to pipeline', () => {
      const tracker = new EyeTracker()
      tracker.destroy()

      expect(mockPipeline.destroy).toHaveBeenCalled()
    })
  })
})
