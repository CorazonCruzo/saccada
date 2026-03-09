import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { useEyeTracking, type NormalizedLandmark } from '@/features/eye-tracking'
import { getCalibrationPoints, getValidationPoints, computeAccuracy, type CalibrationPoint } from '@/features/calibration'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

type Phase = 'instructions' | 'calibrating' | 'validating' | 'validating-wait' | 'results'
type CalibrationMode = 'gaze' | 'click'

const CLICKS_PER_POINT = 5
const VALIDATION_GAZE_DELAY = 2000

// Gaze-only calibration: ~2s per point at ~20fps
const GAZE_SAMPLES_TARGET = 40
const GAZE_SAMPLE_INTERVAL_MS = 50
const GAZE_SETTLE_DELAY_MS = 800 // let eye fixate on new point before collecting
const GAZE_FIRST_POINT_DELAY_MS = 1500 // extra time for first point

// Face mesh canvas size
const MESH_W = 480
const MESH_H = 360

// Iris landmark indices (MediaPipe Face Landmarker)
const IRIS_INDICES = new Set([468, 469, 470, 471, 472, 473, 474, 475, 476, 477])

/**
 * Draw face landmark dots on a canvas.
 * Teal colored, flickering. Iris landmarks highlighted.
 */
function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number,
  dpr: number,
  time: number,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    const x = (1 - lm.x) * w
    const y = lm.y * h

    const isIris = IRIS_INDICES.has(i)

    // Flicker: sinusoidal opacity variation per dot
    const flicker = 0.45 + 0.55 * Math.sin(time * 6 + i * 0.37)
    const depthAlpha = 0.5 + 0.5 * Math.min(Math.max(1 - lm.z * 3, 0), 1)

    if (isIris) {
      // Iris: larger, brighter, slightly different hue (more cyan-white)
      const alpha = (0.7 + 0.3 * flicker) * depthAlpha
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(130,230,220,${alpha.toFixed(2)})`
      ctx.fill()
      // Glow ring
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(46,196,182,${(alpha * 0.2).toFixed(2)})`
      ctx.fill()
    } else {
      const alpha = flicker * depthAlpha
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(46,196,182,${alpha.toFixed(2)})`
      ctx.fill()
    }
  }
}

/** SVG ring for gaze-only progress around calibration dot */
function GazeProgressRing({ progress, size }: { progress: number; size: number }) {
  const r = size / 2 - 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress)

  return (
    <svg
      width={size}
      height={size}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(46,196,182,0.15)"
        strokeWidth={2}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(46,196,182,0.8)"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 60ms linear' }}
      />
    </svg>
  )
}

export default function CalibrationPage() {
  const navigate = useNavigate()
  const { setSessionState, setCalibratedAt } = useSessionStore()
  const { getTracker, sleep } = useEyeTracking()
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('instructions')
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>('gaze')
  const [pointIndex, setPointIndex] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const [points, setPoints] = useState<CalibrationPoint[]>([])
  const [validationPoints, setValidationPoints] = useState<CalibrationPoint[]>([])
  const [accuracy, setAccuracy] = useState<{ avgError: number; maxError: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gazeProgress, setGazeProgress] = useState(0)
  const [faceDetected, setFaceDetected] = useState(true)

  const validationResults = useRef<Array<{ predicted: CalibrationPoint; actual: CalibrationPoint }>>([])
  const gazeSamplesRef = useRef<number>(0)
  const gazeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Face mesh overlay
  const meshCanvasRef = useRef<HTMLCanvasElement>(null)
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null)
  const meshRafRef = useRef(0)
  const meshVisibleRef = useRef(false)

  // On mount: hide any leftover video from a previous session
  useEffect(() => {
    getTracker().showVideo(false)
  }, [getTracker])

  // Face mesh rendering loop
  useEffect(() => {
    const canvas = meshCanvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MESH_W * dpr
    canvas.height = MESH_H * dpr
    const ctx = canvas.getContext('2d')!

    function render() {
      meshRafRef.current = requestAnimationFrame(render)
      const lms = landmarksRef.current
      if (!lms || !meshVisibleRef.current) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, MESH_W, MESH_H)
        return
      }
      drawFaceMesh(ctx, lms, MESH_W, MESH_H, dpr, performance.now() / 1000)
    }

    meshRafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(meshRafRef.current)
  }, [])

  // Generate points on mount
  useEffect(() => {
    setPoints(getCalibrationPoints(window.innerWidth, window.innerHeight))
    setValidationPoints(getValidationPoints(window.innerWidth, window.innerHeight))
  }, [])

  // Show/hide face mesh
  const setMeshVisible = useCallback((visible: boolean) => {
    meshVisibleRef.current = visible
  }, [])

  // ── Gaze-only calibration: auto-collect samples ──
  const stopGazeCollection = useCallback(() => {
    if (gazeIntervalRef.current) {
      clearInterval(gazeIntervalRef.current)
      gazeIntervalRef.current = null
    }
  }, [])

  const advancePoint = useCallback((currentIdx: number, pts: CalibrationPoint[]) => {
    const tracker = getTracker()
    const pt = pts[currentIdx]
    tracker.finalizeCalibrationPoint(pt.x, pt.y)

    const nextIndex = currentIdx + 1
    if (nextIndex >= pts.length) {
      tracker.trainCalibration()
      setPhase('validating')
      setPointIndex(0)
      setGazeProgress(0)
      gazeSamplesRef.current = 0
      validationResults.current = []
    } else {
      setPointIndex(nextIndex)
      setGazeProgress(0)
      gazeSamplesRef.current = 0
    }
  }, [getTracker])

  // Start/restart gaze collection when point changes (gaze mode only)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (phase !== 'calibrating' || calibrationMode !== 'gaze') return

    stopGazeCollection()
    if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null }
    gazeSamplesRef.current = 0
    setGazeProgress(0)

    const tracker = getTracker()
    const pt = points[pointIndex]
    if (!pt) return

    // First point needs extra time (user just entered calibration screen)
    const delay = pointIndex === 0 ? GAZE_FIRST_POINT_DELAY_MS : GAZE_SETTLE_DELAY_MS
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null
      gazeIntervalRef.current = setInterval(() => {
        const captured = tracker.recordCalibrationPoint(pt.x, pt.y)
        if (captured) {
          setFaceDetected(true)
          gazeSamplesRef.current++
          setGazeProgress(gazeSamplesRef.current / GAZE_SAMPLES_TARGET)

          if (gazeSamplesRef.current >= GAZE_SAMPLES_TARGET) {
            stopGazeCollection()
            advancePoint(pointIndex, points)
          }
        } else {
          setFaceDetected(false)
        }
      }, GAZE_SAMPLE_INTERVAL_MS)
    }, delay)

    return () => {
      if (settleTimerRef.current) { clearTimeout(settleTimerRef.current); settleTimerRef.current = null }
      stopGazeCollection()
    }
  }, [phase, calibrationMode, pointIndex, points, getTracker, stopGazeCollection, advancePoint])

  // Start tracker when entering calibration
  const startTracker = useCallback(async () => {
    try {
      const tracker = getTracker()
      await tracker.start(() => {})
      tracker.clearData()
      tracker.setLandmarkCallback((lms) => {
        landmarksRef.current = lms
      })
      setMeshVisible(true)
      setPhase('calibrating')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setError(t.calibration.cameraAccessDenied)
      } else {
        setError(`${t.calibration.initFailed}: ${msg}`)
      }
    }
  }, [getTracker, setMeshVisible, t.calibration])

  // Handle click on calibration point (click mode only)
  function handlePointClick() {
    if (calibrationMode !== 'click') return
    const tracker = getTracker()
    const pt = points[pointIndex]
    tracker.recordCalibrationPoint(pt.x, pt.y)

    const nextClick = clickCount + 1
    if (nextClick >= CLICKS_PER_POINT) {
      tracker.finalizeCalibrationPoint(pt.x, pt.y)
      const nextIndex = pointIndex + 1
      if (nextIndex >= points.length) {
        tracker.trainCalibration()
        setPhase('validating')
        setPointIndex(0)
        setClickCount(0)
        validationResults.current = []
      } else {
        setPointIndex(nextIndex)
        setClickCount(0)
      }
    } else {
      setClickCount(nextClick)
    }
  }

  // Validation: auto-read prediction after a delay
  const validationRunId = useRef(0)

  useEffect(() => {
    if (phase !== 'validating') return

    const runId = ++validationRunId.current

    const timer = setTimeout(async () => {
      if (runId !== validationRunId.current) return

      setPhase('validating-wait')
      const tracker = getTracker()
      const actual = validationPoints[pointIndex]

      const samples: CalibrationPoint[] = []
      for (let i = 0; i < 5; i++) {
        try {
          const predicted = await Promise.race([
            tracker.predict(),
            new Promise<null>(r => setTimeout(() => r(null), 2000)),
          ])
          if (predicted) {
            samples.push({ x: predicted.x, y: predicted.y })
          }
        } catch {
          break
        }
        await new Promise(r => setTimeout(r, 150))
      }

      if (runId !== validationRunId.current) return

      if (samples.length > 0) {
        const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length
        const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length
        validationResults.current.push({
          predicted: { x: avgX, y: avgY },
          actual,
        })
      }

      const nextIndex = pointIndex + 1
      if (nextIndex >= validationPoints.length) {
        setMeshVisible(false)
        getTracker().setLandmarkCallback(null)
        const acc = computeAccuracy(validationResults.current)
        setAccuracy(acc)
        setPhase('results')
      } else {
        setPointIndex(nextIndex)
        setPhase('validating')
      }
    }, VALIDATION_GAZE_DELAY)

    return () => clearTimeout(timer)
  }, [phase, pointIndex, validationPoints, getTracker, setMeshVisible])

  async function handleContinue() {
    const tracker = getTracker()
    tracker.showVideo(false)
    tracker.setLandmarkCallback(null)
    setMeshVisible(false)
    stopGazeCollection()
    await tracker.saveCalibration()
    setCalibratedAt(Date.now())
    setSessionState('mood-check-before')
    navigate('/mood-check?phase=before', { replace: true })
  }

  function handleRecalibrate() {
    const tracker = getTracker()
    tracker.clearData()
    tracker.setLandmarkCallback((lms) => {
      landmarksRef.current = lms
    })
    setMeshVisible(true)
    setPointIndex(0)
    setClickCount(0)
    setGazeProgress(0)
    gazeSamplesRef.current = 0
    setAccuracy(null)
    validationResults.current = []
    setPhase('calibrating')
  }

  function handleCancel() {
    stopGazeCollection()
    getTracker().setLandmarkCallback(null)
    setMeshVisible(false)
    sleep()
    setSessionState('idle')
    navigate('/', { replace: true })
  }

  const currentPoint = phase === 'calibrating' ? points[pointIndex]
    : (phase === 'validating' || phase === 'validating-wait') ? validationPoints[pointIndex]
    : null

  const showMesh = phase === 'calibrating' || phase === 'validating' || phase === 'validating-wait'
  const isValidation = phase === 'validating' || phase === 'validating-wait'

  // Calibration / validation derived values
  const totalPoints = isValidation ? validationPoints.length : points.length
  const progress = `${pointIndex + 1} / ${totalPoints}`
  const dotSize = 40

  // Results derived values
  const noData = accuracy ? !isFinite(accuracy.avgError) : true
  const level = !accuracy ? 'low'
    : noData ? 'low'
    : accuracy.avgError < 150 ? 'excellent'
    : accuracy.avgError < 300 ? 'sufficient'
    : 'low'
  const colorClass = level === 'excellent' ? 'text-teal'
    : level === 'sufficient' ? 'text-turmeric'
    : 'text-lotus'
  const labelMap = { excellent: t.calibration.excellent, sufficient: t.calibration.good, low: t.calibration.low }

  return (
    <>
      {/* Face mesh canvas: always in DOM so useEffect can initialize the rendering loop */}
      <canvas
        ref={meshCanvasRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -55%)',
          width: MESH_W,
          height: MESH_H,
          zIndex: 5,
          pointerEvents: 'none',
          borderRadius: 8,
          display: showMesh ? 'block' : 'none',
        }}
      />

      {/* Error screen */}
      {error ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
          <p className="max-w-sm text-center font-body text-base font-light text-lotus">{error}</p>
          <Button className="mt-6" onClick={handleCancel}>{t.calibration.backToHome}</Button>
        </div>

      /* Instructions */
      ) : phase === 'instructions' ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
          <h1 className="font-heading text-2xl font-bold text-text-bright">{t.calibration.title}</h1>
          <div className="mt-6 max-w-md space-y-4 text-center font-body text-sm font-light leading-relaxed text-text-muted">
            <p>{t.calibration.intro}</p>
            <div className="rounded-lg bg-bg-surface/50 px-4 py-3 text-left">
              <p className="font-heading text-xs tracking-widest text-turmeric uppercase">{t.calibration.howItWorks}</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-text-muted">
                <li><strong className="text-text-bright">{t.calibration.step1}</strong></li>
                <li>{t.calibration.step2Gaze}</li>
                <li>{t.calibration.step3}</li>
              </ol>
            </div>
            <div className="rounded-lg bg-bg-surface/50 px-4 py-3 text-left">
              <p className="font-heading text-xs tracking-widest text-turmeric uppercase">{t.calibration.forBestResults}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-text-muted">
                <li>{t.calibration.tip1}</li>
                <li>{t.calibration.tip2}</li>
                <li>{t.calibration.tip3}</li>
                <li>{t.calibration.tip4}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={handleCancel}>{t.common.cancel}</Button>
            <Button size="lg" onClick={startTracker}>{t.calibration.begin}</Button>
          </div>
        </div>

      /* Results */
      ) : phase === 'results' && accuracy ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
          <h1 className="font-heading text-2xl font-bold text-text-bright">{t.calibration.complete}</h1>
          <div className="mt-6 space-y-2 text-center">
            {noData ? (
              <p className="font-body text-sm text-lotus">{t.calibration.noGazeData}</p>
            ) : (
              <>
                <p className="font-body text-sm text-text-muted">
                  {t.calibration.avgError}: <span className={`font-heading ${colorClass}`}>
                    {Math.round(accuracy.avgError)}px
                  </span>
                </p>
                <p className="font-body text-sm text-text-muted">
                  {t.calibration.accuracy}: <span className={`font-heading font-bold ${colorClass}`}>
                    {labelMap[level]}
                  </span>
                </p>
              </>
            )}
            {level === 'excellent' && !noData && (
              <p className="mt-2 font-body text-xs font-light text-teal/70">
                {t.calibration.adaptiveNote}
              </p>
            )}
            {level === 'sufficient' && !noData && (
              <p className="mt-2 max-w-sm font-body text-xs font-light text-text-dim">
                {t.calibration.goodNote}
              </p>
            )}
            {(level === 'low' || noData) && (
              <p className="mt-2 max-w-sm font-body text-xs font-light text-text-dim">
                {t.calibration.lowNote}
              </p>
            )}
          </div>
          <div className="mt-8 flex gap-3">
            <Button variant="outline" onClick={handleRecalibrate}>{t.sessionSettings.recalibrate}</Button>
            {!noData && <Button size="lg" onClick={handleContinue}>{t.calibration.continueToSession}</Button>}
          </div>
        </div>

      /* Calibration / Validation point screen */
      ) : (
        <div className="fixed inset-0 bg-bg-deep">
          {/* Progress */}
          <div className="absolute inset-x-0 top-4 z-20 flex items-center justify-center gap-4">
            <span className="font-heading text-xs tracking-widest text-text-dim uppercase">
              {isValidation ? t.calibration.validationLabel : t.calibration.calibrationLabel}
            </span>
            <span className="font-heading text-sm text-turmeric">{progress}</span>
            {!isValidation && calibrationMode === 'click' && (
              <span className="font-body text-xs text-text-dim">
                ({clickCount}/{CLICKS_PER_POINT} {t.calibration.clicks})
              </span>
            )}
          </div>

          {/* Face not detected warning (gaze mode) */}
          {phase === 'calibrating' && calibrationMode === 'gaze' && !faceDetected && (
            <div className="absolute inset-x-0 top-14 z-20 flex justify-center">
              <p className="animate-pulse font-body text-xs font-light text-lotus">
                {t.calibration.faceNotDetected}
              </p>
            </div>
          )}

          {/* Validation hint */}
          {isValidation && (
            <div className="absolute inset-x-0 bottom-16 z-20 flex justify-center">
              <p className="font-body text-xs font-light text-text-dim">
                {phase === 'validating-wait' ? t.calibration.readingGaze : t.calibration.lookAtDot}
              </p>
            </div>
          )}

          {/* Cancel */}
          <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center">
            <Button variant="outline" size="sm" onClick={handleCancel}>{t.common.cancel}</Button>
          </div>

          {/* The target point */}
          {currentPoint && (
            <button
              onClick={!isValidation && calibrationMode === 'click' ? handlePointClick : undefined}
              className="absolute z-10"
              style={{
                left: currentPoint.x - dotSize / 2,
                top: currentPoint.y - dotSize / 2,
                width: dotSize,
                height: dotSize,
                cursor: calibrationMode === 'click' && !isValidation ? 'pointer' : 'default',
              }}
              aria-label={`${isValidation ? t.calibration.validationLabel : t.calibration.calibrationLabel} point ${pointIndex + 1}`}
            >
              {/* Gaze progress ring (gaze mode, calibration phase only) */}
              {phase === 'calibrating' && calibrationMode === 'gaze' && (
                <GazeProgressRing progress={gazeProgress} size={dotSize} />
              )}
              <span
                className={`block rounded-full shadow-[0_0_16px_rgba(255,107,53,0.5)] transition-transform ${
                  phase === 'validating-wait'
                    ? 'animate-pulse bg-turmeric'
                    : calibrationMode === 'click' && !isValidation
                      ? 'bg-saffron hover:scale-110'
                      : 'bg-saffron'
                }`}
                style={{ width: 20, height: 20, margin: '10px auto' }}
              />
            </button>
          )}
        </div>
      )}
    </>
  )
}
