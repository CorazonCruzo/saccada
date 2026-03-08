import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { useEyeTracking } from '@/features/eye-tracking'
import { getCalibrationPoints, getValidationPoints, computeAccuracy, type CalibrationPoint } from '@/features/calibration'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

type Phase = 'instructions' | 'calibrating' | 'validating' | 'validating-wait' | 'results'

const CLICKS_PER_POINT = 5
const VALIDATION_GAZE_DELAY = 2000

export default function CalibrationPage() {
  const navigate = useNavigate()
  const { setSessionState, setCalibratedAt } = useSessionStore()
  const { getTracker, sleep } = useEyeTracking()
  const { t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('instructions')
  const [pointIndex, setPointIndex] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const [points, setPoints] = useState<CalibrationPoint[]>([])
  const [validationPoints, setValidationPoints] = useState<CalibrationPoint[]>([])
  const [accuracy, setAccuracy] = useState<{ avgError: number; maxError: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validationResults = useRef<Array<{ predicted: CalibrationPoint; actual: CalibrationPoint }>>([])

  // On mount: hide any leftover video container from a previous
  // tracker lifecycle (e.g. prior calibration or session).
  useEffect(() => {
    getTracker().showVideo(false)
  }, [getTracker])

  // Generate points on mount
  useEffect(() => {
    setPoints(getCalibrationPoints(window.innerWidth, window.innerHeight))
    setValidationPoints(getValidationPoints(window.innerWidth, window.innerHeight))
  }, [])

  // Start WebGazer when entering calibration
  const startTracker = useCallback(async () => {
    try {
      const tracker = getTracker()
      await tracker.start(() => {
        // Gaze callback active during calibration — predictions are
        // collected via recordCalibrationPoint clicks, not here.
      })
      tracker.clearData()
      tracker.showVideo(true)
      setPhase('calibrating')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setError(t.calibration.cameraAccessDenied)
      } else {
        setError(`${t.calibration.initFailed}: ${msg}`)
      }
    }
  }, [getTracker, t.calibration])

  // Handle click on calibration point
  function handlePointClick() {
    const tracker = getTracker()
    const pt = points[pointIndex]
    tracker.recordCalibrationPoint(pt.x, pt.y)

    const nextClick = clickCount + 1
    if (nextClick >= CLICKS_PER_POINT) {
      const nextIndex = pointIndex + 1
      if (nextIndex >= points.length) {
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

  // Validation: auto-read prediction after a delay.
  // Wrapped in try-catch because MediaPipe WASM can crash mid-validation.
  // Uses a ref to track the active validation run — setPhase('validating-wait')
  // triggers a re-render that cleans up this effect, but the async work must
  // continue to completion. Only abort if a NEW validation run starts or
  // the component truly unmounts.
  const validationRunId = useRef(0)

  useEffect(() => {
    if (phase !== 'validating') return

    const runId = ++validationRunId.current

    const timer = setTimeout(async () => {
      // If a newer run started, bail
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

      // Check again — component may have unmounted or recalibrate clicked
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
        getTracker().showVideo(false)
        const acc = computeAccuracy(validationResults.current)
        setAccuracy(acc)
        setPhase('results')
      } else {
        setPointIndex(nextIndex)
        setPhase('validating')
      }
    }, VALIDATION_GAZE_DELAY)

    return () => clearTimeout(timer)
  }, [phase, pointIndex, validationPoints, getTracker])

  async function handleContinue() {
    const tracker = getTracker()
    tracker.showVideo(false)
    // Save regression data to IndexedDB so calibration survives page refresh
    await tracker.saveCalibration()
    setCalibratedAt(Date.now())
    setSessionState('countdown')
    navigate('/session', { replace: true })
  }

  function handleRecalibrate() {
    const tracker = getTracker()
    tracker.clearData()
    tracker.showVideo(true)
    setPointIndex(0)
    setClickCount(0)
    setAccuracy(null)
    validationResults.current = []
    setPhase('calibrating')
  }

  function handleCancel() {
    sleep()
    setSessionState('idle')
    navigate('/', { replace: true })
  }

  const currentPoint = phase === 'calibrating' ? points[pointIndex]
    : (phase === 'validating' || phase === 'validating-wait') ? validationPoints[pointIndex]
    : null

  // Error screen
  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
        <p className="max-w-sm text-center font-body text-base font-light text-lotus">{error}</p>
        <Button className="mt-6" onClick={handleCancel}>{t.calibration.backToHome}</Button>
      </div>
    )
  }

  // Instructions
  if (phase === 'instructions') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
        <h1 className="font-heading text-2xl font-bold text-text-bright">{t.calibration.title}</h1>
        <div className="mt-6 max-w-md space-y-4 text-center font-body text-sm font-light leading-relaxed text-text-muted">
          <p>{t.calibration.intro}</p>
          <div className="rounded-lg bg-bg-surface/50 px-4 py-3 text-left">
            <p className="font-heading text-xs tracking-widest text-turmeric uppercase">{t.calibration.howItWorks}</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-text-muted">
              <li><strong className="text-text-bright">{t.calibration.step1}</strong></li>
              <li>{t.calibration.step2}</li>
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
    )
  }

  // Results
  if (phase === 'results' && accuracy) {
    const noData = !isFinite(accuracy.avgError)
    const level = noData ? 'low'
      : accuracy.avgError < 150 ? 'excellent'
      : accuracy.avgError < 300 ? 'sufficient'
      : 'low'
    const colorClass = level === 'excellent' ? 'text-teal'
      : level === 'sufficient' ? 'text-turmeric'
      : 'text-lotus'
    const labelMap = { excellent: t.calibration.excellent, sufficient: t.calibration.good, low: t.calibration.low }

    return (
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
    )
  }

  // Calibration / Validation point screen
  const isValidation = phase === 'validating' || phase === 'validating-wait'
  const totalPoints = isValidation ? validationPoints.length : points.length
  const progress = `${pointIndex + 1} / ${totalPoints}`

  return (
    <div className="fixed inset-0 bg-bg-deep">
      {/* Progress */}
      <div className="absolute inset-x-0 top-4 flex items-center justify-center gap-4">
        <span className="font-heading text-xs tracking-widest text-text-dim uppercase">
          {isValidation ? t.calibration.validationLabel : t.calibration.calibrationLabel}
        </span>
        <span className="font-heading text-sm text-turmeric">{progress}</span>
        {!isValidation && (
          <span className="font-body text-xs text-text-dim">
            ({clickCount}/{CLICKS_PER_POINT} {t.calibration.clicks})
          </span>
        )}
      </div>

      {/* Validation hint */}
      {isValidation && (
        <div className="absolute inset-x-0 bottom-16 flex justify-center">
          <p className="font-body text-xs font-light text-text-dim">
            {phase === 'validating-wait' ? t.calibration.readingGaze : t.calibration.lookAtDot}
          </p>
        </div>
      )}

      {/* Cancel */}
      <div className="absolute bottom-4 inset-x-0 flex justify-center">
        <Button variant="outline" size="sm" onClick={handleCancel}>{t.common.cancel}</Button>
      </div>

      {/* The target point */}
      {currentPoint && (
        <button
          onClick={!isValidation ? handlePointClick : undefined}
          className="absolute z-10 cursor-pointer"
          style={{
            left: currentPoint.x - 20,
            top: currentPoint.y - 20,
            width: 40,
            height: 40,
          }}
          aria-label={`${isValidation ? t.calibration.validationLabel : t.calibration.calibrationLabel} point ${pointIndex + 1}`}
        >
          <span
            className={`block rounded-full shadow-[0_0_16px_rgba(255,107,53,0.5)] transition-transform ${
              phase === 'validating-wait' ? 'animate-pulse bg-turmeric' : 'bg-saffron hover:scale-110'
            }`}
            style={{ width: 20, height: 20, margin: '10px auto' }}
          />
        </button>
      )}
    </div>
  )
}
