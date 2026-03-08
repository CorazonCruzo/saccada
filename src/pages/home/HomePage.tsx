import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { PatternPicker } from '@/widgets/pattern-picker'
import { SettingsPanel } from '@/widgets/settings-panel'
import { SessionPlayer } from '@/widgets/session-player'
import { useAudio } from '@/features/audio'
import { shouldCalibrate } from '@/features/calibration'
import { useEyeTracking } from '@/features/eye-tracking'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

export default function HomePage() {
  const navigate = useNavigate()
  const { selectedPattern, selectPattern, soundEnabled, eyeTrackingEnabled, calibratedAt, speed, visualScale } = useSessionStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const audioEngine = useAudio()
  const { getTracker } = useEyeTracking()
  const { t, tp } = useTranslation()
  const patternT = tp(selectedPattern.id)

  // Check onboarding
  if (!localStorage.getItem('saccada-onboarded')) {
    return <Navigate to="/onboarding" replace />
  }

  async function handleStart() {
    // Init AudioContext in user gesture context (click handler)
    if (soundEnabled) {
      audioEngine.init()
    }
    setSettingsOpen(false)

    // Always go to mood check first (user can skip it)
    useSessionStore.getState().setSessionState('mood-check-before')
    navigate('/mood-check?phase=before')
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
        <p className="mt-2 font-body text-sm font-light text-text-muted">
          {t.home.tagline}
        </p>
      </div>

      {/* Pattern picker */}
      <div className="mx-auto mt-6 w-full max-w-3xl">
        <PatternPicker
          selectedPattern={selectedPattern}
          onSelect={selectPattern}
        />
      </div>

      {/* Start area */}
      <div className="mx-auto mt-8 flex items-center gap-3">
        <Button size="lg" onClick={() => setSettingsOpen(true)}>
          {t.home.startButton} {patternT.name}
        </Button>
      </div>

      {/* Selected pattern quick info */}
      <div className="mx-auto mt-3 text-center">
        {selectedPattern.nameDevanagari && (
          <span className="font-devanagari text-sm text-gold">
            {selectedPattern.nameDevanagari}
          </span>
        )}
        <p className="mt-0.5 font-body text-xs font-light text-text-dim">
          {t.trajectory[selectedPattern.trajectory]}
          {selectedPattern.cycleDuration ? ` \u00B7 ${selectedPattern.cycleDuration}ms/cycle` : ''}
          {' \u00B7 '}
          {t.audioMode[selectedPattern.audioConfig.mode]}
          {selectedPattern.requiresHeadphones ? ' \u00B7 \uD83C\uDFA7' : ''}
        </p>
      </div>

      {/* Canvas preview */}
      <div className="mx-auto mt-6 h-56 w-full max-w-2xl overflow-hidden rounded-xl border border-border-ornament">
        <SessionPlayer
          pattern={selectedPattern}
          isPlaying={true}
          speed={speed}
          visualScale={visualScale}
        />
      </div>

      {/* Footer links */}
      <div className="mx-auto mt-12 flex items-center gap-6">
        <button
          onClick={() => navigate('/onboarding')}
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

      {/* Settings dialog */}
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onStart={handleStart}
      />
    </div>
  )
}
