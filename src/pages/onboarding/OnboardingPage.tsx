import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/button'

const slides = [
  {
    devanagari: '\u0926\u0943\u0937\u094D\u091F\u093F \u092D\u0947\u0926',
    title: 'Saccada',
    body: 'Eye movement therapy combining ancient Drishti Bheda traditions from Indian classical dance, EMDR bilateral stimulation, and REM sleep neuroscience.',
  },
  {
    devanagari: '\u092C\u093F\u0928\u094D\u0926\u0941',
    title: 'Follow the Bindu',
    body: 'A glowing dot guides your eyes through therapeutic movement patterns. Each pattern activates different aspects of visual and cognitive processing. Phases of movement and fixation alternate naturally.',
  },
  {
    devanagari: '\u0928\u093E\u0926',
    title: 'Best with Headphones',
    body: 'Bilateral audio pans left and right with the dot. Binaural beats create theta waves for deep processing. Drone modes provide meditative ambiance. All sound is synthesized in real time.',
  },
  {
    devanagari: '\u0917\u094B\u092A\u0928\u0940\u092F',
    title: 'Your Data Stays Here',
    body: 'No accounts, no servers, no telemetry. Everything runs in your browser. Your sessions and data never leave your device.',
  },
]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
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

      {/* Slide content */}
      <div className="max-w-md text-center">
        <p className="font-devanagari text-2xl text-gold">{slide.devanagari}</p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-text-bright">
          {slide.title}
        </h1>
        <p className="mt-4 font-body text-base font-light leading-relaxed text-text-muted">
          {slide.body}
        </p>
      </div>

      {/* Navigation: Prev / Next same row, same size */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          {!isFirst && (
            <Button size="lg" variant="outline" onClick={() => setCurrent((c) => c - 1)}>
              Prev
            </Button>
          )}
          <Button size="lg" onClick={next}>
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>

        {/* Skip — small text link below */}
        {!isLast && (
          <button
            onClick={complete}
            className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
