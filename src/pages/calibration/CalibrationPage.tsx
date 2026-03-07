import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { useEyeTracking } from '@/features/eye-tracking'
import { getCalibrationPoints, getValidationPoints, computeAccuracy, type CalibrationPoint } from '@/features/calibration'
import { Button } from '@/shared/ui/button'

type Phase = 'instructions' | 'calibrating' | 'validating' | 'validating-wait' | 'results'

const CLICKS_PER_POINT = 5
const VALIDATION_GAZE_DELAY = 2000

export default function CalibrationPage() {
  const navigate = useNavigate()
  const { setSessionState, setCalibratedAt } = useSessionStore()
  const { getTracker, sleep } = useEyeTracking()

  const [phase, setPhase] = useState<Phase>('instructions')
  const [pointIndex, setPointIndex] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const [points, setPoints] = useState<CalibrationPoint[]>([])
  const [validationPoints, setValidationPoints] = useState<CalibrationPoint[]>([])
  const [accuracy, setAccuracy] = useState<{ avgError: number; maxError: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validationResults = useRef<Array<{ predicted: CalibrationPoint; actual: CalibrationPoint }>>([])

  // Generate points on mount
  useEffect(() => {
    setPoints(getCalibrationPoints(window.innerWidth, window.innerHeight))
    setValidationPoints(getValidationPoints(window.innerWidth, window.innerHeight))
  }, [])

  // Start WebGazer when entering calibration
  const startTracker = useCallback(async () => {
    try {
      // Clear old calibration data from localStorage to prevent pollution
      try {
        localStorage.removeItem('webgazerGlobalData')
        localStorage.removeItem('webgazerGlobalSettings')
      } catch { /* localStorage may be unavailable */ }

      const tracker = getTracker()
      let gazeCount = 0
      await tracker.start((point) => {
        gazeCount++
        if (gazeCount % 15 === 1) {
          console.log(`[Gaze] #${gazeCount}: (${Math.round(point.x)}, ${Math.round(point.y)})`)
        }
      })
      // Clear any data loaded from previous sessions
      tracker.clearData()
      // Show webcam preview with face mesh overlay during calibration
      tracker.showVideo(true)
      setPhase('calibrating')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setError('Camera access denied. Please allow camera in browser settings and try again.')
      } else {
        setError(`Eye tracking initialization failed: ${msg}`)
      }
    }
  }, [getTracker])

  // Handle click on calibration point
  function handlePointClick() {
    const tracker = getTracker()
    const pt = points[pointIndex]
    console.log(`[Calibration click] point ${pointIndex + 1}/${points.length}, click ${clickCount + 1}/${CLICKS_PER_POINT}, pos: (${Math.round(pt.x)}, ${Math.round(pt.y)})`)
    tracker.recordCalibrationPoint(pt.x, pt.y)

    const nextClick = clickCount + 1
    if (nextClick >= CLICKS_PER_POINT) {
      const nextIndex = pointIndex + 1
      if (nextIndex >= points.length) {
        // All calibration done, start validation (keep video for predictions)
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

  // Validation: auto-read prediction after a delay (no click needed)
  useEffect(() => {
    if (phase !== 'validating') return

    // Show the point, wait for the user to look at it, then read prediction
    const timer = setTimeout(async () => {
      setPhase('validating-wait')
      const tracker = getTracker()
      const actual = validationPoints[pointIndex]

      // Take multiple samples and average them for better accuracy
      const samples: CalibrationPoint[] = []
      for (let i = 0; i < 5; i++) {
        const predicted = await tracker.predict()
        if (predicted) {
          samples.push({ x: predicted.x, y: predicted.y })
        }
        await new Promise(r => setTimeout(r, 150))
      }

      console.log(`[Validation ${pointIndex + 1}/${validationPoints.length}]`, {
        actual: { x: Math.round(actual.x), y: Math.round(actual.y) },
        samples: samples.map(s => ({ x: Math.round(s.x), y: Math.round(s.y) })),
        samplesCount: samples.length,
      })

      if (samples.length > 0) {
        const avgX = samples.reduce((s, p) => s + p.x, 0) / samples.length
        const avgY = samples.reduce((s, p) => s + p.y, 0) / samples.length
        const dist = Math.sqrt((avgX - actual.x) ** 2 + (avgY - actual.y) ** 2)
        console.log(`  Predicted avg: (${Math.round(avgX)}, ${Math.round(avgY)}), error: ${Math.round(dist)}px`)
        validationResults.current.push({
          predicted: { x: avgX, y: avgY },
          actual,
        })
      } else {
        console.warn('  No predictions returned!')
      }

      const nextIndex = pointIndex + 1
      if (nextIndex >= validationPoints.length) {
        // Validation done: hide video preview
        getTracker().showVideo(false)
        const acc = computeAccuracy(validationResults.current)
        console.log('[Calibration results]', {
          avgError: Math.round(acc.avgError),
          maxError: Math.round(acc.maxError),
          totalPoints: validationResults.current.length,
        })
        setAccuracy(acc)
        setPhase('results')
      } else {
        setPointIndex(nextIndex)
        setPhase('validating')
      }
    }, VALIDATION_GAZE_DELAY)

    return () => clearTimeout(timer)
  }, [phase, pointIndex, validationPoints, getTracker])

  function handleContinue() {
    // Keep camera running for session, just hide preview
    getTracker().showVideo(false)
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
        <Button className="mt-6" onClick={handleCancel}>Back to Home</Button>
      </div>
    )
  }

  // Instructions
  if (phase === 'instructions') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
        <h1 className="font-heading text-2xl font-bold text-text-bright">Eye Tracking Calibration</h1>
        <div className="mt-6 max-w-md space-y-4 text-center font-body text-sm font-light leading-relaxed text-text-muted">
          <p>
            The camera will track your eye position during the session.
            First, we need to calibrate it to your setup.
          </p>
          <div className="rounded-lg bg-bg-surface/50 px-4 py-3 text-left">
            <p className="font-heading text-xs tracking-widest text-turmeric uppercase">How it works</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-text-muted">
              <li><strong className="text-text-bright">Look at the dot</strong> with your eyes</li>
              <li>While looking, <strong className="text-text-bright">click it</strong> ({CLICKS_PER_POINT} times per dot)</li>
              <li>9 dots total, then a quick accuracy check</li>
            </ol>
          </div>
          <div className="rounded-lg bg-bg-surface/50 px-4 py-3 text-left">
            <p className="font-heading text-xs tracking-widest text-turmeric uppercase">For best results</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-text-muted">
              <li>Bright, even lighting on your face</li>
              <li>Camera at eye level</li>
              <li>Keep your head still throughout</li>
              <li>Sit ~50-70cm from the screen</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button size="lg" onClick={startTracker}>Begin Calibration</Button>
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
    const labelMap = { excellent: 'Excellent', sufficient: 'Good', low: 'Low' }

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
        <h1 className="font-heading text-2xl font-bold text-text-bright">Calibration Complete</h1>
        <div className="mt-6 space-y-2 text-center">
          {noData ? (
            <p className="font-body text-sm text-lotus">
              No gaze data collected. Make sure your face is visible to the camera.
            </p>
          ) : (
            <>
              <p className="font-body text-sm text-text-muted">
                Average error: <span className={`font-heading ${colorClass}`}>
                  {Math.round(accuracy.avgError)}px
                </span>
              </p>
              <p className="font-body text-sm text-text-muted">
                Accuracy: <span className={`font-heading font-bold ${colorClass}`}>
                  {labelMap[level]}
                </span>
              </p>
            </>
          )}
          {level === 'excellent' && !noData && (
            <p className="mt-2 font-body text-xs font-light text-teal/70">
              Eye tracking will adapt dot speed to your gaze during the session.
            </p>
          )}
          {level === 'sufficient' && !noData && (
            <p className="mt-2 max-w-sm font-body text-xs font-light text-text-dim">
              Good enough for adaptive speed. Recalibrate for better precision if needed.
            </p>
          )}
          {(level === 'low' || noData) && (
            <p className="mt-2 max-w-sm font-body text-xs font-light text-text-dim">
              Try recalibrating with brighter lighting, keeping your head still,
              and looking directly at each dot before clicking.
            </p>
          )}
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={handleRecalibrate}>Recalibrate</Button>
          {!noData && <Button size="lg" onClick={handleContinue}>Continue to Session</Button>}
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
          {isValidation ? 'Validation' : 'Calibration'}
        </span>
        <span className="font-heading text-sm text-turmeric">{progress}</span>
        {!isValidation && (
          <span className="font-body text-xs text-text-dim">
            ({clickCount}/{CLICKS_PER_POINT} clicks)
          </span>
        )}
      </div>

      {/* Validation hint */}
      {isValidation && (
        <div className="absolute inset-x-0 bottom-16 flex justify-center">
          <p className="font-body text-xs font-light text-text-dim">
            {phase === 'validating-wait' ? 'Reading gaze...' : 'Look at the dot (no click needed)'}
          </p>
        </div>
      )}

      {/* Cancel */}
      <div className="absolute bottom-4 inset-x-0 flex justify-center">
        <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
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
          aria-label={`${isValidation ? 'Validation' : 'Calibration'} point ${pointIndex + 1}`}
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
