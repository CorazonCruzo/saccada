import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { drawMoodFlame } from '@/features/animation'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

const MOOD_LEVELS = [1, 2, 3, 4, 5] as const
const FLAME_W = 80
const FLAME_H = 140
// Extra canvas padding so glow fades to zero naturally, not clipped at edges
const PAD_X = 40
const PAD_Y = 30
const CANVAS_W = FLAME_W + PAD_X * 2
const CANVAS_H = FLAME_H + PAD_Y * 2

function MoodFlame({
  level,
  selected,
  dimmed,
  onClick,
  label,
}: {
  level: number
  selected: boolean
  dimmed: boolean
  onClick: () => void
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    const ctx = canvas.getContext('2d')!

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      const time = performance.now() / 1000
      // Draw flame centered in the padded canvas
      drawMoodFlame(ctx, CANVAS_W / 2, PAD_Y + FLAME_H * 0.75, time, level, 0.9)
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
          ? 'scale-110'
          : dimmed
            ? 'opacity-35 hover:opacity-60'
            : 'opacity-70 hover:opacity-90'
      }`}
      style={{ padding: '6px 2px' }}
      aria-label={`${label} (${level}/5)`}
    >
      {/* Selection glow (bindu-like circle beneath flame) */}
      {selected && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 40,
            height: 40,
            background: 'radial-gradient(circle, rgba(232,163,56,0.25) 0%, rgba(232,163,56,0) 70%)',
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          display: 'block',
          margin: `-${PAD_Y}px -${PAD_X}px`,
        }}
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
    lastSession,
    setLastSession,
  } = useSessionStore()

  const [selected, setSelected] = useState<number | null>(null)

  const title = phase === 'before' ? t.mood.howAreYouNow : t.mood.howAreYouAfter

  function navigateToSession() {
    setSessionState('countdown')
    navigate('/session', { replace: true })
  }

  function handleContinue() {
    if (phase === 'before') {
      setMoodBefore(selected)
      navigateToSession()
    } else {
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
      <div className="mt-6 flex items-end gap-0.5 sm:gap-2">
        {/* Left label */}
        <span className="mb-16 font-heading text-xs tracking-wider text-teal/70 uppercase">
          {t.mood.calm}
        </span>

        {/* Flames */}
        {MOOD_LEVELS.map((level) => (
          <MoodFlame
            key={level}
            level={level}
            selected={selected === level}
            dimmed={selected != null && selected !== level}
            onClick={() => setSelected(level)}
            label={t.mood.levels[level - 1]}
          />
        ))}

        {/* Right label */}
        <span className="mb-16 font-heading text-xs tracking-wider text-lotus/70 uppercase">
          {t.mood.restless}
        </span>
      </div>

      {/* Level label */}
      <p className="mt-1 h-6 font-body text-sm text-text-muted">
        {selected != null ? t.mood.levels[selected - 1] : ''}
      </p>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-4">
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
