import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { SessionPlayer } from '@/widgets/session-player'
import { PatternInfoDialog } from '@/widgets/pattern-picker'
import { useAudio, detectPhaseTransition } from '@/features/audio'
import {
  useEyeTracking,
  GazeLog,
  createAdaptiveSpeedState,
  updateAdaptiveSpeed,
} from '@/features/eye-tracking'
import { useTranslation } from '@/shared/lib/i18n'
import { useSessionOrientation } from '@/shared/lib/useSessionOrientation'
import { unlockOrientation } from '@/shared/lib/orientation'
import { Button } from '@/shared/ui/button'
import { RotateDeviceOverlay } from '@/shared/ui/rotate-overlay'
import { formatTimer } from '@/shared/lib/format'

type SessionPhase = 'countdown' | 'active' | 'paused' | 'cooldown'

/** Sessions shorter than this are discarded (not saved) */
export const MIN_SESSION_DURATION_MS = 1000

export default function SessionPage() {
  const {
    selectedPattern,
    speed,
    volume,
    soundEnabled,
    hapticEnabled,
    guidedMode,
    sessionDuration,
    visualScale,
    backgroundPattern,
    backgroundRotation,
    setSessionState,
    setLastSession,
  } = useSessionStore()

  const navigate = useNavigate()
  const audioEngine = useAudio()
  const { getTracker, sleep: sleepTracker } = useEyeTracking()
  const eyeTrackingEnabled = useSessionStore((s) => s.eyeTrackingEnabled)
  const { t, tp } = useTranslation()
  const { needsRotation } = useSessionOrientation()

  // Local session lifecycle
  const [phase, setPhase] = useState<SessionPhase>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [hudVisible, setHudVisible] = useState(true)
  const [currentInstruction, setCurrentInstruction] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [guideVisible, setGuideVisible] = useState(true)

  // Refs for accurate timing
  const activeStartRef = useRef(0)
  const accumulatedRef = useRef(0)
  const hudTimerRef = useRef(0)
  const audioStartedRef = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const lastPhaseIndexRef = useRef(-1)
  const phaseTransitionStateRef = useRef({ lastPhaseType: null as 'movement' | 'fixation' | 'eyes-closed' | null })

  // Adaptive speed + gaze logging
  const gazeLogRef = useRef(new GazeLog())
  const adaptiveStateRef = useRef(createAdaptiveSpeedState())
  const adaptiveMultiplierRef = useRef(1.0)
  const dotPosRef = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const gazeRef = useRef<{ x: number; y: number } | null>(null)
  const gazeCountRef = useRef(0)

  // Eye tracking: ensure camera is live for the session
  useEffect(() => {
    if (!eyeTrackingEnabled) return

    const tracker = getTracker()
    gazeCountRef.current = 0

    tracker.start((point) => {
      gazeCountRef.current++
      gazeRef.current = { x: point.x, y: point.y }

      const { w, h, x: dotX, y: dotY } = dotPosRef.current

      // Skip gaze recording and adaptive speed during eyes-closed phases:
      // eyes are closed, so gaze data is noise
      if (phaseTransitionStateRef.current.lastPhaseType === 'eyes-closed') return

      // Only record gaze when animation is active and dot position is initialized
      if (phaseRef.current === 'active' && w > 0) {
        gazeLogRef.current.record({ ...point, dotX, dotY })
      }
      const m = updateAdaptiveSpeed(
        adaptiveStateRef.current,
        point.t,
        { x: point.x, y: point.y, t: point.t },
        dotX,
        dotY,
        w,
        h,
      )
      adaptiveMultiplierRef.current = m

    }).catch((err) => {
      console.error('[Saccada] Eye tracking start failed:', err)
    })
  }, [eyeTrackingEnabled, getTracker])

  // -- Countdown --
  useEffect(() => {
    if (phase !== 'countdown') return
    setSessionState('countdown')

    if (countdown <= 0) {
      setPhase('active')
      return
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown, setSessionState])

  // -- Audio start when entering active --
  useEffect(() => {
    if (phase !== 'active') return
    setSessionState('active')

    if (!audioStartedRef.current) {
      if (soundEnabled) {
        audioEngine.init()
        audioEngine.setVolume((volume / 100) ** 2)
        audioEngine.start(selectedPattern.audioConfig)
      }
      audioStartedRef.current = true
      activeStartRef.current = performance.now()
    } else {
      activeStartRef.current = performance.now()
      if (soundEnabled) {
        audioEngine.resume()
      }
    }
  }, [phase, soundEnabled, audioEngine, volume, selectedPattern.audioConfig, setSessionState])

  // -- Audio pause --
  useEffect(() => {
    if (phase !== 'paused') return
    setSessionState('paused')

    accumulatedRef.current += performance.now() - activeStartRef.current
    if (soundEnabled) {
      audioEngine.pause()
    }
  }, [phase, soundEnabled, audioEngine, setSessionState])

  // -- Elapsed timer --
  useEffect(() => {
    if (phase !== 'active') return

    const interval = setInterval(() => {
      const currentElapsed = accumulatedRef.current + (performance.now() - activeStartRef.current)
      setElapsed(currentElapsed)

      if (sessionDuration > 0 && currentElapsed >= sessionDuration) {
        accumulatedRef.current = currentElapsed
        setPhase('cooldown')
      }
    }, 200)

    return () => clearInterval(interval)
  }, [phase, sessionDuration])

  // -- Cooldown -> Results --
  useEffect(() => {
    if (phase !== 'cooldown') return
    setSessionState('cooldown')
    audioEngine.stop()
    if (eyeTrackingEnabled) sleepTracker()

    const finalElapsed = accumulatedRef.current

    // Discard sessions too short to be meaningful (e.g., quit during countdown)
    if (finalElapsed < MIN_SESSION_DURATION_MS) {
      const timer = setTimeout(() => {
        void unlockOrientation()
        setSessionState('idle')
        navigate('/', { replace: true })
      }, 1000)
      return () => clearTimeout(timer)
    }

    const completed = sessionDuration === 0 || finalElapsed >= sessionDuration

    const gazePoints = gazeLogRef.current.getPoints()

    const timer = setTimeout(() => {
      setLastSession({
        patternId: selectedPattern.id,
        patternName: patternTrans.name,
        elapsed: Math.round(finalElapsed),
        completed,
        timestamp: Date.now(),
        gazePoints: gazePoints.length > 0 ? gazePoints : undefined,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        speed: useSessionStore.getState().speed,
        visualScale: useSessionStore.getState().visualScale,
      })
      setSessionState('reflection')
      navigate('/reflection', { replace: true })
    }, 3000)

    return () => clearTimeout(timer)
  }, [phase, audioEngine, sessionDuration, selectedPattern, setLastSession, setSessionState, navigate, eyeTrackingEnabled, sleepTracker])

  // -- HUD auto-hide --
  const resetHud = useCallback(() => {
    setHudVisible(true)
    clearTimeout(hudTimerRef.current)
    hudTimerRef.current = window.setTimeout(() => setHudVisible(false), 3000)
  }, [])

  useEffect(() => {
    if (phase !== 'active') {
      setHudVisible(true)
      return
    }

    resetHud()
    window.addEventListener('mousemove', resetHud)
    window.addEventListener('touchstart', resetHud)

    return () => {
      window.removeEventListener('mousemove', resetHud)
      window.removeEventListener('touchstart', resetHud)
      clearTimeout(hudTimerRef.current)
    }
  }, [phase, resetHud])

  // -- Guided mode instructions (synced with animation loop via onFrame callback) --
  const patternTrans = tp(selectedPattern.id)

  useEffect(() => {
    if (!guidedMode || phase !== 'active') {
      setCurrentInstruction(null)
      lastPhaseIndexRef.current = -1
    }
    if (phase !== 'active') {
      phaseTransitionStateRef.current.lastPhaseType = null
    }
  }, [guidedMode, phase])

  // -- Keyboard shortcuts --
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const p = phaseRef.current
      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (p === 'active') setPhase('paused')
          else if (p === 'paused') setPhase('active')
          break
        case 'Escape':
          if (p === 'cooldown') break
          if (p === 'active') {
            accumulatedRef.current += performance.now() - activeStartRef.current
          }
          setPhase('cooldown')
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'i':
        case 'I':
          if (p === 'active') {
            setPhase('paused')
            setInfoOpen(true)
          }
          break
        case 'g':
        case 'G':
          setGuideVisible((v) => !v)
          break
        case '+':
        case '=':
          useSessionStore.getState().setVisualScale(useSessionStore.getState().visualScale + 0.1)
          break
        case '-':
        case '_':
          useSessionStore.getState().setVisualScale(useSessionStore.getState().visualScale - 0.1)
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -- Cleanup on unmount --
  useEffect(() => {
    return () => {
      audioEngine.stop()
      clearTimeout(hudTimerRef.current)
    }
  }, [audioEngine])

  // -- Handlers --

  function handlePause() {
    if (phase === 'active') setPhase('paused')
  }

  function handleResume() {
    if (infoOpen) setInfoOpen(false)
    if (phase === 'paused') setPhase('active')
  }

  function handleStop() {
    if (phase === 'active') {
      accumulatedRef.current += performance.now() - activeStartRef.current
    }
    setPhase('cooldown')
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
  }

  // Track dot position for adaptive speed + sync guided instruction with animation phase
  const handleDotMove = useCallback((dotX: number, dotY: number, canvasW: number, canvasH: number, phaseIndex: number, phaseType: 'movement' | 'fixation' | 'eyes-closed') => {
    dotPosRef.current = { x: dotX, y: dotY, w: canvasW, h: canvasH }
    if (guidedMode && phaseIndex !== lastPhaseIndexRef.current) {
      lastPhaseIndexRef.current = phaseIndex
      let text = patternTrans.phases[phaseIndex] ?? null
      // Strip bell references when sound is off (bell won't play)
      if (text && !soundEnabled) {
        text = text.replace(/^(?:Колокольчик|Bell|Campana) — /i, '')
          .replace(/ Следующий колокольчик — сигнал открыть глаза\./, '')
          .replace(/ Колокольчик подскажет, когда открыть глаза\./, '')
          .replace(/ The next bell means open your eyes\./, '')
          .replace(/ The bell will signal when to open\./, '')
          .replace(/ La siguiente campana es la señal para abrir los ojos\./, '')
          .replace(/ La campana te indicará cuándo abrir\./, '')
      }
      setCurrentInstruction(text)
    }
    // Singing bowl strike on eyes-closed transitions
    const signal = detectPhaseTransition(phaseTransitionStateRef.current, phaseType)
    if (signal && soundEnabled) {
      audioEngine.strikePhaseTransition(signal)
    }
  }, [guidedMode, patternTrans, soundEnabled, audioEngine])

  // Speed multiplier applied directly in animation loop via ref (no React render lag)

  const isStopwatch = sessionDuration === 0
  const remaining = Math.max(0, sessionDuration - elapsed)

  // -- Countdown screen --
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep session-cursor session-cursor-hidden">
        {needsRotation && <RotateDeviceOverlay />}
        <div className="text-center">
          <p className="font-heading text-sm tracking-widest text-text-dim uppercase">
            {patternTrans.name}
          </p>
          <div
            key={countdown}
            className="mt-4 animate-pulse font-heading text-8xl font-bold text-saffron"
          >
            {countdown}
          </div>
        </div>
      </div>
    )
  }

  // -- Cooldown screen --
  if (phase === 'cooldown') {
    return (
      <div className="fixed inset-0 z-50 bg-bg-deep session-cursor session-cursor-hidden">
        {needsRotation && <RotateDeviceOverlay />}
        <SessionPlayer
          pattern={selectedPattern}
          isPlaying={false}
          speed={speed}
          speedMultiplierRef={adaptiveMultiplierRef}
          visualScale={visualScale}
          backgroundPattern={backgroundPattern}
          backgroundRotation={backgroundRotation}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-bg-deep/80 transition-opacity duration-[3000ms]">
          <p className="font-body text-lg font-light text-text-muted animate-pulse">
            {t.session.sessionComplete}
          </p>
        </div>
      </div>
    )
  }

  // -- Active / Paused session --
  return (
    <div className={`fixed inset-0 z-50 session-cursor ${!hudVisible && phase === 'active' ? 'session-cursor-hidden' : ''}`}>
      {needsRotation && <RotateDeviceOverlay />}
      <SessionPlayer
        pattern={selectedPattern}
        isPlaying={phase === 'active'}
        speed={speed}
        speedMultiplierRef={adaptiveMultiplierRef}
        visualScale={visualScale}
        backgroundPattern={backgroundPattern}
        backgroundRotation={backgroundRotation}
        audioEngine={audioEngine}
        soundEnabled={soundEnabled}
        hapticEnabled={hapticEnabled}
        onDotMove={handleDotMove}
      />

      {/* Guided instruction: always visible (independent of HUD) */}
      {guidedMode && guideVisible && currentInstruction && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex justify-center px-8">
          <p className="max-w-lg rounded-lg bg-bg-deep/70 px-6 py-3 text-center font-body text-base font-light leading-relaxed text-text-bright/90 backdrop-blur-sm sm:text-lg">
            {currentInstruction}
          </p>
        </div>
      )}

      {/* HUD overlay */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          hudVisible || phase === 'paused' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top: pattern name + timer */}
        <div className="pointer-events-auto absolute inset-x-0 top-4 flex items-center justify-center gap-6">
          <span className="font-heading text-sm tracking-widest text-text-dim">
            {patternTrans.name.toUpperCase()}
          </span>
          {selectedPattern.nameDevanagari && (
            <span className="font-devanagari text-sm text-gold">
              {selectedPattern.nameDevanagari}
            </span>
          )}
          <span className="font-heading text-sm tabular-nums text-turmeric">
            {formatTimer(isStopwatch ? elapsed : remaining)}
          </span>
        </div>

        {/* Audio indicator */}
        {soundEnabled && (
          <div className="absolute right-4 top-4 font-heading text-xs text-teal">
            {t.audioMode[selectedPattern.audioConfig.mode].toUpperCase()}
            {selectedPattern.requiresHeadphones ? ` \u00B7 ${t.session.headphones}` : ''}
          </div>
        )}

        {/* Bottom controls */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
          {/* Info button */}
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-gold/40 bg-bg-surface text-text-bright hover:border-gold/70 hover:bg-bg-surface/90"
            onClick={() => { handlePause(); setInfoOpen(true) }}
            aria-label="Pattern info"
          >
            <span className="text-base font-semibold">i</span>
          </Button>

          {/* Guide visibility toggle */}
          {guidedMode && (
            <Button
              variant="outline"
              size="icon"
              className={`h-10 w-10 rounded-full border-border-ornament bg-bg-surface/80 hover:text-text-bright ${
                guideVisible ? 'text-turmeric' : 'text-text-dim'
              }`}
              onClick={() => setGuideVisible((v) => !v)}
              aria-label={guideVisible ? t.session.hideGuide : t.session.showGuide}
              title={guideVisible ? t.session.hideGuide : t.session.showGuide}
            >
              <span className="font-heading text-xs font-semibold">Aa</span>
            </Button>
          )}

          {/* Pause / Resume */}
          {phase === 'paused' ? (
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={handleResume}
            >
              {t.session.resume}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-border-ornament bg-bg-surface/80 text-text-muted hover:text-text-bright"
              onClick={handlePause}
              aria-label="Pause"
            >
              <span className="text-lg">||</span>
            </Button>
          )}

          {/* Stop */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-border-ornament bg-bg-surface/80 text-text-muted hover:text-text-bright"
            onClick={handleStop}
            aria-label="Stop session"
          >
            <span className="text-sm">{'\u2715'}</span>
          </Button>
        </div>

        {/* Paused overlay */}
        {phase === 'paused' && !infoOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-deep/40">
            <p className="font-heading text-2xl tracking-widest text-text-dim">{t.session.paused}</p>
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      {hudVisible && (
        <div className="pointer-events-none absolute bottom-6 right-4 hidden rounded-md bg-bg-surface/60 px-3 py-1.5 font-heading text-xs tracking-wide text-text-muted backdrop-blur-sm [@media(hover:hover)]:block">
          {t.session.keyHints}
        </div>
      )}

      {/* Info dialog */}
      <PatternInfoDialog
        pattern={selectedPattern}
        open={infoOpen}
        onOpenChange={(open) => {
          setInfoOpen(open)
          if (!open && phase === 'paused') setPhase('active')
        }}
      />
    </div>
  )
}
