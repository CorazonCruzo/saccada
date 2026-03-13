import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { patternsById } from '@/entities/pattern'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

const HEART_COUNT = 5

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={className}
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

export default function ReflectionPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { lastSession, setLastSession, setSessionState, selectedPattern } = useSessionStore()

  const [rating, setRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const pattern = patternsById[lastSession?.patternId ?? ''] ?? selectedPattern
  const sessionType = pattern.sessionType as 'calming' | 'activating' | 'focusing' | 'processing'
  const question = t.reflection.question[sessionType] ?? t.reflection.title

  function navigateToResults() {
    setSessionState('results')
    navigate('/results', { replace: true })
  }

  function handleSave() {
    if (lastSession) {
      setLastSession({
        ...lastSession,
        reflectionRating: rating ?? undefined,
        note: note.trim() || lastSession.note,
      })
    }
    navigateToResults()
  }

  function handleSkip() {
    navigateToResults()
  }

  const displayRating = hoveredRating ?? rating

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-deep px-6">
      {/* Question */}
      <p className="max-w-sm text-center font-heading text-xl font-bold text-text-bright">
        {question}
      </p>

      {/* Heart rating */}
      <div className="mt-8 flex items-center gap-3">
        {Array.from({ length: HEART_COUNT }, (_, i) => {
          const value = i + 1
          const isFilled = displayRating != null && value <= displayRating
          return (
            <button
              key={value}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(null)}
              className={`cursor-pointer transition-all duration-200 ${
                isFilled ? 'text-saffron scale-110' : 'text-text-dim hover:text-gold/50'
              }`}
              aria-label={`${value}/5 — ${t.reflection.ratingLabels[i]}`}
            >
              <HeartIcon filled={isFilled} className="h-10 w-10" />
            </button>
          )
        })}
      </div>

      {/* Rating label */}
      <p className="mt-2 h-6 font-body text-sm text-text-muted">
        {rating != null ? t.reflection.ratingLabels[rating - 1] : ''}
      </p>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.reflection.notePlaceholder}
        rows={2}
        className="mt-4 w-full max-w-sm resize-none rounded-lg border border-border-ornament bg-bg-surface/50 px-3 py-2 font-body text-sm text-text-bright placeholder:text-text-dim focus:border-gold/40 focus:outline-none"
      />

      {/* Actions */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSkip}
          className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
        >
          {t.reflection.skip}
        </button>
        <Button onClick={handleSave} disabled={rating == null}>
          {t.reflection.save}
        </Button>
      </div>
    </div>
  )
}
