import { useState, useEffect } from 'react'
import { useSessionStore } from '@/entities/session'
import { type BackgroundRotation, allBackgroundPatterns, rotatableBackgrounds } from '@/entities/pattern'
import { checkCameraPermission, requestCameraAccess } from '@/features/eye-tracking'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Slider } from '@/shared/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { formatDurationLabel } from '@/shared/lib/format'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: () => void
}

export function SettingsPanel({ open, onOpenChange, onStart }: SettingsPanelProps) {
  const {
    selectedPattern,
    sessionDuration, setSessionDuration,
    speed, setSpeed,
    volume, setVolume,
    soundEnabled, toggleSound,
    guidedMode, toggleGuided,
    moodCheckEnabled, toggleMoodCheck,
    eyeTrackingEnabled, setEyeTracking,
    calibratedAt, setCalibratedAt,
    visualScale, setVisualScale,
    backgroundPattern, setBackgroundPattern,
    backgroundRotation, setBackgroundRotation,
  } = useSessionStore()

  const { t, tp } = useTranslation()
  const patternT = tp(selectedPattern.id)
  const [cameraStatus, setCameraStatus] = useState<string | null>(null)
  const [cameraLoading, setCameraLoading] = useState(false)

  // Auto-disable eye tracking if camera permission was revoked externally
  useEffect(() => {
    if (!open || !eyeTrackingEnabled) return
    checkCameraPermission().then((p) => {
      if (p !== 'granted') {
        setEyeTracking(false)
        setCalibratedAt(null)
      }
    })
  }, [open, eyeTrackingEnabled, setEyeTracking, setCalibratedAt])

  async function handleToggleEyeTracking() {
    if (cameraLoading) return

    if (eyeTrackingEnabled) {
      setEyeTracking(false)
      setCameraStatus(null)
      return
    }

    setCameraStatus(null)
    setCameraLoading(true)
    try {
      const permission = await checkCameraPermission()

      if (permission === 'unavailable') {
        setCameraStatus(t.sessionSettings.cameraNotAvailable)
        return
      }

      if (permission === 'denied') {
        setCameraStatus(t.sessionSettings.cameraDenied)
        return
      }

      // Permission already granted — no need to open a throwaway stream
      if (permission === 'granted') {
        setEyeTracking(true)
        return
      }

      // Permission is 'prompt' — must request to trigger browser dialog
      const granted = await requestCameraAccess()
      if (granted) {
        setEyeTracking(true)
      } else {
        setCameraStatus(t.sessionSettings.cameraDenied)
      }
    } finally {
      setCameraLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[5vh] translate-y-0 border-border-ornament bg-bg-mid sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-text-bright">
            {t.sessionSettings.title}
          </DialogTitle>
          {selectedPattern.nameDevanagari && (
            <p className="font-devanagari text-sm text-gold">{selectedPattern.nameDevanagari}</p>
          )}
          <p className="font-body text-sm font-light text-text-muted">
            {patternT.name} &middot; {t.trajectory[selectedPattern.trajectory]}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Duration mode + slider */}
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant={sessionDuration > 0 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { if (sessionDuration === 0) setSessionDuration(120_000) }}
              >
                {t.sessionSettings.timerMode}
              </Button>
              <Button
                variant={sessionDuration === 0 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSessionDuration(0)}
              >
                {t.sessionSettings.stopwatchMode}
              </Button>
            </div>
            {sessionDuration > 0 ? (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.duration}</span>
                  <span className="font-heading text-sm text-turmeric">{formatDurationLabel(sessionDuration)}</span>
                </div>
                <Slider
                  value={[sessionDuration]}
                  onValueChange={([v]) => setSessionDuration(v)}
                  min={30_000}
                  max={1_800_000}
                  step={30_000}
                  className="mt-2"
                />
              </div>
            ) : (
              <p className="mt-3 font-body text-xs font-light text-text-muted">
                {t.sessionSettings.unlimited}
              </p>
            )}
          </div>

          {/* Speed */}
          <div>
            <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.speed}</span>
            <div className="mt-2 flex gap-2">
              {[0.5, 1, 1.5, 2].map((s) => (
                <Button
                  key={s}
                  variant={speed === s ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>

          {/* Visual Scale */}
          <div>
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.visualScale}</span>
              <span className="font-heading text-sm text-turmeric">{visualScale.toFixed(1)}x</span>
            </div>
            <Slider
              value={[visualScale]}
              onValueChange={([v]) => setVisualScale(v)}
              min={0.3}
              max={3}
              step={0.1}
              className="mt-2"
            />
            <p className="mt-1 font-body text-[10px] font-light text-text-dim">
              {t.sessionSettings.visualScaleHint}
            </p>
          </div>

          {/* Background */}
          <div>
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.background}</span>
              {(backgroundPattern !== selectedPattern.defaultBackground || backgroundRotation !== selectedPattern.defaultBackgroundRotation) && (
                <button
                  onClick={() => {
                    setBackgroundPattern(selectedPattern.defaultBackground)
                    setBackgroundRotation(selectedPattern.defaultBackgroundRotation)
                  }}
                  className="cursor-pointer font-body text-[10px] font-light text-text-dim underline transition-colors hover:text-text-muted"
                >
                  {t.sessionSettings.resetBackground}
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {allBackgroundPatterns.map((bgId) => (
                <button
                  key={bgId}
                  onClick={() => setBackgroundPattern(bgId)}
                  className={`cursor-pointer rounded-md px-1.5 py-1 font-heading text-[10px] font-semibold tracking-wide transition-all ${
                    backgroundPattern === bgId
                      ? 'bg-gold/15 text-gold'
                      : 'text-text-dim hover:text-text-muted'
                  }`}
                >
                  {t.backgroundName[bgId] ?? bgId}
                </button>
              ))}
            </div>
            {backgroundPattern !== 'zen' && rotatableBackgrounds.has(backgroundPattern) && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-heading text-[10px] tracking-wide text-text-dim">{t.sessionSettings.backgroundRotation}</span>
                {(['ccw', 'none', 'cw'] as BackgroundRotation[]).map((rot) => (
                  <button
                    key={rot}
                    onClick={() => setBackgroundRotation(rot)}
                    className={`cursor-pointer rounded-md px-2 py-0.5 font-heading text-[10px] font-semibold transition-all ${
                      backgroundRotation === rot
                        ? 'bg-gold/15 text-gold'
                        : 'text-text-dim hover:text-text-muted'
                    }`}
                  >
                    {rot === 'ccw' ? t.sessionSettings.rotationCCW
                      : rot === 'cw' ? t.sessionSettings.rotationCW
                      : t.sessionSettings.rotationNone}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {/* Sound */}
            <ToggleRow
              label={t.sessionSettings.sound}
              icon={'\u266A'}
              active={soundEnabled}
              activeColor="saffron"
              onToggle={toggleSound}
            />

            {/* Volume */}
            {soundEnabled && (
              <div className="flex items-center gap-2 pl-6">
                <span className="font-heading text-xs tracking-wide text-text-dim">{t.sessionSettings.volume}</span>
                <Slider
                  value={[volume]}
                  onValueChange={([v]) => setVolume(v)}
                  max={100}
                  step={1}
                  className="w-32"
                />
                <span className="font-heading text-xs text-turmeric">{volume}%</span>
              </div>
            )}

            {/* Headphones warning */}
            {soundEnabled && selectedPattern.requiresHeadphones && (
              <div className="ml-6 flex items-center gap-1.5 text-xs">
                <span>{'\uD83C\uDFA7'}</span>
                <span className="font-body font-light text-indigo">{t.sessionSettings.headphonesRecommended}</span>
              </div>
            )}

            {/* Guided */}
            <ToggleRow
              label={t.sessionSettings.guided}
              icon={'\u2630'}
              active={guidedMode}
              activeColor="turmeric"
              onToggle={toggleGuided}
            />

            {/* Mood check */}
            <ToggleRow
              label={t.sessionSettings.moodCheck}
              icon={'\u2661'}
              active={moodCheckEnabled}
              activeColor="gold"
              onToggle={toggleMoodCheck}
            />

            {/* Eye Tracking — desktop only, hidden on mobile */}
            <div className="hidden [@media(hover:hover)]:contents">
              <ToggleRow
                label={t.sessionSettings.eyeTracking}
                icon={'\u25CE'}
                active={eyeTrackingEnabled}
                activeColor="indigo"
                onToggle={handleToggleEyeTracking}
              />
              {eyeTrackingEnabled && !calibratedAt && (
                <p className="ml-6 font-body text-[10px] font-light text-indigo">
                  {t.sessionSettings.calibrationNeeded}
                </p>
              )}
              {eyeTrackingEnabled && calibratedAt && (
                <div className="ml-6 flex items-center gap-2">
                  <p className="font-body text-[10px] font-light text-teal">
                    {t.sessionSettings.calibrated}
                  </p>
                  <button
                    onClick={() => setCalibratedAt(null)}
                    className="cursor-pointer font-body text-[10px] font-light text-text-dim underline transition-colors hover:text-text-muted"
                  >
                    {t.sessionSettings.recalibrate}
                  </button>
                </div>
              )}
              {cameraStatus && (
                <p className="ml-6 font-body text-[10px] font-light text-lotus">
                  {cameraStatus}
                </p>
              )}
            </div>
          </div>

          {/* Start button */}
          <Button size="lg" className="w-full" onClick={onStart}>
            {t.sessionSettings.beginSession}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const activeStyles: Record<string, { bg: string; text: string; dot: string }> = {
  saffron: { bg: 'bg-saffron/15', text: 'text-saffron', dot: 'bg-saffron' },
  teal: { bg: 'bg-teal/15', text: 'text-teal', dot: 'bg-teal' },
  turmeric: { bg: 'bg-turmeric/15', text: 'text-turmeric', dot: 'bg-turmeric' },
  gold: { bg: 'bg-gold/15', text: 'text-gold', dot: 'bg-gold' },
  indigo: { bg: 'bg-indigo/15', text: 'text-indigo', dot: 'bg-indigo' },
}

function ToggleRow({
  label,
  icon,
  active,
  activeColor,
  onToggle,
}: {
  label: string
  icon: string
  active: boolean
  activeColor: string
  onToggle: () => void
}) {
  const styles = activeStyles[activeColor] ?? activeStyles.saffron

  return (
    <button
      onClick={onToggle}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all ${
        active
          ? `${styles.bg} ${styles.text}`
          : 'text-text-dim hover:text-text-muted'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span className="font-heading text-sm font-semibold tracking-wide">{label}</span>
      <span
        className={`ml-auto inline-block h-2 w-2 rounded-full ${
          active ? styles.dot : 'bg-text-dim'
        }`}
      />
    </button>
  )
}
