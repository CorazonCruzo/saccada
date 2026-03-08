import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { shouldCalibrate } from '@/features/calibration'
import { useEyeTracking } from '@/features/eye-tracking'
import { drawMoodFlame } from '@/features/animation'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

const MOOD_LEVELS = [1, 2, 3, 4, 5] as const
const FLAME_W = 70
const FLAME_H = 110

function MoodFlame({
  level,
  selected,
  onClick,
  label,
}: {
  level: number
  selected: boolean
  onClick: () => void
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = FLAME_W * dpr
    canvas.height = FLAME_H * dpr
    const ctx = canvas.getContext('2d')!

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, FLAME_W, FLAME_H)
      const time = performance.now() / 1000
      drawMoodFlame(ctx, FLAME_W / 2, FLAME_H * 0.72, time, level, 0.85)
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [level])

  return (
    <button
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl transition-all duration-300 ${
        selected
          ? 'scale-115 ring-2 ring-turmeric/60 ring-offset-2 ring-offset-bg-deep bg-bg-surface/40'
          : 'opacity-60 hover:opacity-90 hover:bg-bg-surface/20'
      }`}
      style={{ padding: '8px 4px' }}
      aria-label={`${label} (${level}/5)`}
      title={label}
    >
      <canvas
        ref={canvasRef}
        style={{ width: FLAME_W, height: FLAME_H, display: 'block' }}
      />
    </button>
  )
}

export default function MoodCheckPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phase = searchParams.get('phase') as 'before' | 'after' ?? 'before'
  const { t } = useTranslation()

  const {
    setMoodBefore,
    setSessionState,
    eyeTrackingEnabled,
    calibratedAt,
    lastSession,
    setLastSession,
  } = useSessionStore()
  const { getTracker } = useEyeTracking()

  const [selected, setSelected] = useState<number | null>(null)

  const title = phase === 'before' ? t.mood.howAreYouNow : t.mood.howAreYouAfter

  const navigateToSession = useCallback(async () => {
    if (await shouldCalibrate(eyeTrackingEnabled, calibratedAt, getTracker().isReady())) {
      setSessionState('calibrating')
      navigate('/calibration', { replace: true })
    } else {
      setSessionState('countdown')
      navigate('/session', { replace: true })
    }
  }, [eyeTrackingEnabled, calibratedAt, getTracker, setSessionState, navigate])

  function handleContinue() {
    if (phase === 'before') {
      setMoodBefore(selected)
      navigateToSession()
    } else {
      // After: save moodAfter to lastSession and go to results
      if (lastSession) {
        setLastSession({ ...lastSession, moodAfter: selected ?? undefined })
      }
      setSessionState('results')
      navigate('/results', { replace: true })
    }
  }

  function handleSkip() {
    if (phase === 'before') {
      setMoodBefore(null)
      navigateToSession()
    } else {
      setSessionState('results')
      navigate('/results', { replace: true })
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
      <p className="font-heading text-xl font-bold text-text-bright">
        {title}
      </p>
      <p className="mt-2 font-body text-sm font-light text-text-dim">
        {t.mood.flamePrompt}
      </p>

      {/* Edge labels + flames */}
      <div className="mt-8 flex items-end gap-1 sm:gap-3">
        {/* Left label */}
        <span className="mb-14 font-heading text-xs tracking-wider text-teal/70 uppercase">
          {t.mood.calm}
        </span>

        {/* Flames */}
        {MOOD_LEVELS.map((level) => (
          <MoodFlame
            key={level}
            level={level}
            selected={selected === level}
            onClick={() => setSelected(level)}
            label={t.mood.levels[level - 1]}
          />
        ))}

        {/* Right label */}
        <span className="mb-14 font-heading text-xs tracking-wider text-lotus/70 uppercase">
          {t.mood.restless}
        </span>
      </div>

      {/* Level label */}
      <p className="mt-3 h-6 font-body text-sm text-text-muted">
        {selected != null ? t.mood.levels[selected - 1] : ''}
      </p>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handleSkip}
          className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
        >
          {t.mood.skip}
        </button>
        <Button onClick={handleContinue} disabled={selected == null}>
          {t.mood.continue}
        </Button>
      </div>
    </div>
  )
}
