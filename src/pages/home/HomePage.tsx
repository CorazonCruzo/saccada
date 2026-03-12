import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { PatternPicker } from '@/widgets/pattern-picker'
import { SessionPlayer } from '@/widgets/session-player'
import { PreSessionDialog } from '@/pages/pre-session/PreSessionPage'
import { useTranslation } from '@/shared/lib/i18n'

export default function HomePage() {
  const navigate = useNavigate()
  const { selectedPattern, selectPattern, speed, visualScale, backgroundPattern, backgroundRotation } = useSessionStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { t } = useTranslation()

  // Check onboarding
  if (!localStorage.getItem('saccada-onboarded')) {
    return <Navigate to="/onboarding" replace />
  }

  function handleSelectPattern(p: typeof selectedPattern) {
    selectPattern(p)
    setSettingsOpen(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <p className="font-devanagari text-lg text-gold">
          {'\u0926\u0943\u0937\u094D\u091F\u093F \u092D\u0947\u0926'}
        </p>
        <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-text-bright">
          Saccada
        </h1>
      </div>

      {/* Pattern picker */}
      <div className="mx-auto mt-6 w-full max-w-5xl">
        <PatternPicker
          selectedPattern={selectedPattern}
          onSelect={handleSelectPattern}
        />
      </div>

      {/* Canvas preview */}
      <div className="mx-auto mt-6 h-56 w-full max-w-2xl overflow-hidden rounded-xl border border-border-ornament">
        <SessionPlayer
          pattern={selectedPattern}
          isPlaying={true}
          speed={speed}
          visualScale={visualScale}
          backgroundPattern={backgroundPattern}
          backgroundRotation={backgroundRotation}
        />
      </div>

      {/* Footer links */}
      <div className="mx-auto mt-12 flex items-center gap-6">
        <button
          onClick={() => navigate('/about')}
          className="cursor-pointer font-body text-xs font-light text-text-dim transition-colors hover:text-text-muted"
        >
          {t.home.aboutLink}
        </button>
        <button
          onClick={() => navigate('/history')}
          className="cursor-pointer font-body text-xs font-light text-text-dim transition-colors hover:text-text-muted"
        >
          {t.history.title}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="cursor-pointer font-body text-xs font-light text-text-dim transition-colors hover:text-text-muted"
        >
          {t.settingsPage.title}
        </button>
      </div>

      {/* Pre-session dialog */}
      <PreSessionDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
