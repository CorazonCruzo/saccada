import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/shared/lib/i18n'
import { drawBindu } from '@/features/animation'
import { setupCanvas } from '@/shared/lib/canvas'
import { Button } from '@/shared/ui/button'

const devanagariTitles = [
  '\u0926\u0943\u0937\u094D\u091F\u093F \u092D\u0947\u0926',
  '\u092C\u093F\u0928\u094D\u0926\u0941',
  '\u0928\u093E\u0926',
  '\u0935\u093F\u0935\u0947\u0915',
  '\u0917\u094B\u092A\u0928\u0940\u092F',
]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const slides = t.onboarding.slides
  const isLast = current === slides.length - 1
  const isFirst = current === 0

  function complete() {
    localStorage.setItem('saccada-onboarded', '1')
    navigate('/', { replace: true })
  }

  function next() {
    if (isLast) {
      complete()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  const slide = slides[current]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6">
      {/* Progress dots */}
      <div className="absolute top-6 flex gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
              i === current ? 'bg-saffron' : i < current ? 'bg-gold/50' : 'bg-text-dim/30'
            }`}
          />
        ))}
      </div>

      {/* Animated bindu on slide 2 */}
      {current === 1 && <BinduPreview />}

      {/* Slide content */}
      <div className="max-w-md text-center">
        <p className="font-devanagari text-2xl text-gold">{devanagariTitles[current]}</p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-text-bright">
          {slide.title}
        </h1>
        <p className="mt-4 font-body text-base font-light leading-relaxed text-text-muted">
          {slide.body}
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          {!isFirst && (
            <Button size="lg" variant="outline" onClick={() => setCurrent((c) => c - 1)}>
              {t.onboarding.prev}
            </Button>
          )}
          <Button size="lg" onClick={next}>
            {isLast ? t.onboarding.getStarted : t.onboarding.next}
          </Button>
        </div>

        {!isLast && (
          <button
            onClick={complete}
            className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
          >
            {t.onboarding.skip}
          </button>
        )}
      </div>
    </div>
  )
}

/** Small pulsating bindu shown on the "Follow the Bindu" slide */
function BinduPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setupCanvas(canvas, 80, 80)

    function animate() {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas!.width / dpr
      const h = canvas!.height / dpr
      ctx.clearRect(0, 0, w, h)
      const phase = performance.now() / 1000 * 1.8
      drawBindu(ctx, w / 2, h / 2, '#c4956a', phase, 14)
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return <canvas ref={canvasRef} className="mb-4 h-20 w-20" />
}
