import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { type BackgroundRotation, type BackgroundPatternId, allBackgroundPatterns, rotatableBackgrounds } from '@/entities/pattern'
import { useAudio } from '@/features/audio'
import { shouldCalibrate } from '@/features/calibration'
import { checkCameraPermission, requestCameraAccess } from '@/features/eye-tracking'
import { useEyeTracking } from '@/features/eye-tracking'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Slider } from '@/shared/ui/slider'
import { ContextualHint } from '@/shared/ui/contextual-hint'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { formatDurationLabel } from '@/shared/lib/format'

interface PreSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreSessionDialog({ open, onOpenChange }: PreSessionDialogProps) {
  const navigate = useNavigate()
  const {
    selectedPattern,
    sessionDuration, setSessionDuration,
    speed, setSpeed,
    volume, setVolume,
    soundEnabled, toggleSound,
    guidedMode, toggleGuided,
    eyeTrackingEnabled, setEyeTracking,
    calibratedAt, setCalibratedAt,
    visualScale, setVisualScale,
    backgroundPattern, setBackgroundPattern,
    backgroundRotation, setBackgroundRotation,
    sensitivityDismissed, setSensitivityDismissed,
  } = useSessionStore()

  const { t, tp } = useTranslation()
  const patternT = tp(selectedPattern.id)
  const audioEngine = useAudio()
  const { getTracker } = useEyeTracking()

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sensitivityOpen, setSensitivityOpen] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setAdvancedOpen(false)
      setSensitivityOpen(false)
    }
  }, [open])
  const [cameraLoading, setCameraLoading] = useState(false)

  async function handleStart() {
    if (soundEnabled) {
      audioEngine.init()
    }
    onOpenChange(false)

    if (await shouldCalibrate(eyeTrackingEnabled, calibratedAt, getTracker().isReady())) {
      useSessionStore.getState().setSessionState('calibrating')
      navigate('/calibration')
    } else {
      useSessionStore.getState().setSessionState('countdown')
      navigate('/session')
    }
  }

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
      if (permission === 'unavailable') { setCameraStatus(t.sessionSettings.cameraNotAvailable); return }
      if (permission === 'denied') { setCameraStatus(t.sessionSettings.cameraDenied); return }
      if (permission === 'granted') { setEyeTracking(true); return }
      const granted = await requestCameraAccess()
      if (granted) setEyeTracking(true)
      else setCameraStatus(t.sessionSettings.cameraDenied)
    } finally {
      setCameraLoading(false)
    }
  }

  const recommendedMin = Math.round(selectedPattern.recommendedDuration / 60_000)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="top-[5vh] translate-y-0 border-border-ornament bg-bg-mid sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-text-bright">
              {patternT.name}
            </DialogTitle>
            {selectedPattern.nameDevanagari && (
              <p className="font-devanagari text-sm text-gold">{selectedPattern.nameDevanagari}</p>
            )}
          </DialogHeader>

          <div className="space-y-5">
            {/* Instruction */}
            <div className="rounded-lg border border-border-ornament bg-bg-surface/50 p-4">
              <h2 className="mb-2 font-heading text-xs tracking-widest text-turmeric uppercase">
                {t.preSession.howTo}
              </h2>
              <p className="font-body text-sm leading-relaxed text-text-bright sm:text-base">
                {patternT.instruction}
              </p>
            </div>

            {/* Effects */}
            <div>
              <h2 className="font-heading text-xs tracking-widest text-turmeric uppercase">
                {t.preSession.effects}
              </h2>
              <p className="mt-2 font-body text-sm leading-relaxed text-text-bright sm:text-base">
                {patternT.effect}
              </p>
              <p className="mt-1 font-body text-xs text-teal">
                {t.preSession.recommended}: {recommendedMin} min
              </p>
              {soundEnabled && patternT.soundProfile && (
                <div className="mt-2">
                  <span className="font-heading text-xs tracking-widest text-turmeric uppercase">{t.preSession.soundProfile}: </span>
                  <span className="font-body text-xs text-text-muted">{patternT.soundProfile}</span>
                </div>
              )}
            </div>

            {/* Sensitivity warning */}
            {!sensitivityDismissed && (
              <div className="rounded-md border border-turmeric/20 bg-turmeric/5 px-3 py-2">
                <button
                  onClick={() => setSensitivityOpen(!sensitivityOpen)}
                  className="flex w-full cursor-pointer items-center gap-2 text-left"
                >
                  <span className="text-base">{'\u26A0\uFE0F'}</span>
                  <span className="font-body text-sm text-turmeric">
                    {t.preSession.sensitivityWarning}
                  </span>
                  <span className="ml-auto text-xs text-turmeric">{sensitivityOpen ? '\u25B4' : '\u25BE'}</span>
                </button>
                {sensitivityOpen && (
                  <div className="mt-2">
                    <p className="font-body text-xs leading-relaxed text-text-muted">
                      {t.preSession.sensitivityDetails}
                    </p>
                    <label className="mt-2 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        onChange={(e) => { if (e.target.checked) setSensitivityDismissed(true) }}
                        className="accent-turmeric"
                      />
                      <span className="font-body text-xs text-text-dim">{t.preSession.dontShowAgain}</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Duration */}
            <div>
              <div className="flex items-center gap-2">
                <Button
                  variant={sessionDuration > 0 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { if (sessionDuration === 0) setSessionDuration(300_000) }}
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
                    <span className="font-heading text-xs tracking-widest text-text-dim uppercase">
                      {t.sessionSettings.duration}
                    </span>
                    <span className="font-heading text-sm text-turmeric">
                      {formatDurationLabel(sessionDuration)}
                    </span>
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
                <p className="mt-3 font-body text-xs text-text-muted">
                  {t.sessionSettings.unlimited}
                </p>
              )}
            </div>

            {/* Sound + Volume */}
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSound}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all ${
                    soundEnabled ? 'bg-saffron/15 text-saffron' : 'text-text-dim hover:text-text-muted'
                  }`}
                >
                  <span className="text-base">{'\u266A'}</span>
                  <span className="font-heading text-sm font-semibold tracking-wide">{t.sessionSettings.sound}</span>
                </button>
                {soundEnabled && (
                  <div className="flex flex-1 items-center gap-2">
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
              </div>
              {soundEnabled && selectedPattern.requiresHeadphones && (
                <div className="mt-1.5 ml-2 flex items-center gap-1.5 text-xs">
                  <span>{'\uD83C\uDFA7'}</span>
                  <span className="font-body text-indigo">{t.sessionSettings.headphonesRecommended}</span>
                </div>
              )}
            </div>

            {/* Advanced settings */}
            <div>
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex cursor-pointer items-center gap-2 font-heading text-sm tracking-wider text-text-bright transition-colors hover:text-turmeric"
              >
                <span>{'\u2699\uFE0F'}</span>
                <span>{t.preSession.advancedSettings}</span>
                <span className="text-xs">{advancedOpen ? '\u25B4' : '\u25BE'}</span>
              </button>

              {advancedOpen && (
                <div className="mt-3 space-y-4 rounded-lg border border-border-ornament bg-bg-surface/30 p-4">
                  {/* Speed */}
                  <div>
                    <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.speed}</span>
                    <div className="mt-2 flex gap-2">
                      {[0.5, 1, 1.5, 2].map((s) => (
                        <Button key={s} variant={speed === s ? 'default' : 'ghost'} size="sm" onClick={() => setSpeed(s)}>
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
                    <Slider value={[visualScale]} onValueChange={([v]) => setVisualScale(v)} min={0.3} max={3} step={0.1} className="mt-2" />
                  </div>

                  {/* Background */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.background}</span>
                      {(backgroundPattern !== selectedPattern.defaultBackground || backgroundRotation !== selectedPattern.defaultBackgroundRotation) && (
                        <button
                          onClick={() => { setBackgroundPattern(selectedPattern.defaultBackground); setBackgroundRotation(selectedPattern.defaultBackgroundRotation) }}
                          className="cursor-pointer font-body text-[10px] text-text-dim underline transition-colors hover:text-text-muted"
                        >
                          {t.sessionSettings.resetBackground}
                        </button>
                      )}
                    </div>
                    <div className="mt-2">
                      <Select value={backgroundPattern} onValueChange={(v) => setBackgroundPattern(v as BackgroundPatternId)}>
                        <SelectTrigger size="sm" className="w-44 border-border-ornament bg-bg-surface/50 font-heading text-xs text-text-bright">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border-ornament bg-bg-mid">
                          {allBackgroundPatterns.map((bgId) => (
                            <SelectItem key={bgId} value={bgId} className="font-heading text-xs text-text-bright">
                              {t.backgroundName[bgId] ?? bgId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {backgroundPattern !== 'zen' && rotatableBackgrounds.has(backgroundPattern) && (
                      <div className="mt-3">
                        <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{t.sessionSettings.backgroundRotation}</span>
                        <div className="mt-2 flex items-center gap-1">
                          {(['none', 'ccw', 'cw'] as BackgroundRotation[]).map((rot) => (
                            <button
                              key={rot}
                              onClick={() => setBackgroundRotation(rot)}
                              className={`cursor-pointer rounded-md px-2 py-1 font-heading text-[10px] tracking-wider transition-all ${
                                backgroundRotation === rot ? 'bg-gold/15 text-gold' : 'text-text-dim hover:text-text-muted'
                              }`}
                            >
                              {rot === 'none' ? '\u2715' : rot === 'ccw' ? t.sessionSettings.rotationCCW : t.sessionSettings.rotationCW}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Guided text */}
                  <ToggleRow label={t.sessionSettings.guided} icon={'\u2630'} active={guidedMode} onToggle={toggleGuided} />

                  {/* Eye Tracking — desktop only */}
                  <div className="hidden [@media(hover:hover)]:block">
                    <ToggleRow label={t.sessionSettings.eyeTracking} icon={'\u25CE'} active={eyeTrackingEnabled} onToggle={handleToggleEyeTracking} />
                    {eyeTrackingEnabled && !calibratedAt && (
                      <p className="mt-1.5 pl-2 font-body text-xs text-indigo">{t.sessionSettings.calibrationNeeded}</p>
                    )}
                    {eyeTrackingEnabled && calibratedAt && (
                      <div className="mt-1.5 flex items-center gap-2 pl-2">
                        <p className="font-body text-xs text-teal">{t.sessionSettings.calibrated}</p>
                        <button onClick={() => setCalibratedAt(null)} className="cursor-pointer font-body text-xs text-text-dim underline transition-colors hover:text-text-muted">
                          {t.sessionSettings.recalibrate}
                        </button>
                      </div>
                    )}
                    {cameraStatus && <p className="mt-1.5 pl-2 font-body text-xs text-lotus">{cameraStatus}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Start button */}
            <Button size="lg" className="w-full" onClick={handleStart}>
              {t.preSession.start}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hint: explore advanced settings */}
      <ContextualHint id="hint_advanced_settings" show={open} position="bottom" />
    </>
  )
}

function ToggleRow({ label, icon, active, onToggle }: { label: string; icon: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all ${
        active ? 'bg-turmeric/15 text-turmeric' : 'text-text-dim hover:text-text-muted'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span className="font-heading text-sm font-semibold tracking-wide">{label}</span>
      <span className={`ml-auto inline-block h-2 w-2 rounded-full ${active ? 'bg-turmeric' : 'bg-text-dim'}`} />
    </button>
  )
}
