import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { SessionPlayer } from '@/widgets/session-player'
import { PatternInfoDialog } from '@/widgets/pattern-picker'
import { useAudio } from '@/features/audio'
import { Button } from '@/shared/ui/button'
import { formatTimer } from '@/shared/lib/format'

type SessionPhase = 'countdown' | 'active' | 'paused' | 'cooldown'

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
    setVisualScale,
    setSessionState,
    setLastSession,
  } = useSessionStore()

  const navigate = useNavigate()
  const audioEngine = useAudio()

  // Local session lifecycle
  const [phase, setPhase] = useState<SessionPhase>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [hudVisible, setHudVisible] = useState(true)
  const [currentInstruction, setCurrentInstruction] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  // Refs for accurate timing
  const activeStartRef = useRef(0)
  const accumulatedRef = useRef(0)
  const hudTimerRef = useRef(0)
  const audioStartedRef = useRef(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // ── Countdown ──────────────────────────────────────────
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

  // ── Audio start when entering active ───────────────────
  useEffect(() => {
    if (phase !== 'active') return
    setSessionState('active')

    if (!audioStartedRef.current) {
      // First time entering active — start audio
      if (soundEnabled) {
        audioEngine.init()
        audioEngine.setVolume(volume / 100)
        audioEngine.start(selectedPattern.audioConfig)
      }
      audioStartedRef.current = true
      activeStartRef.current = performance.now()
    } else {
      // Resuming from pause
      activeStartRef.current = performance.now()
      if (soundEnabled) {
        audioEngine.resume()
      }
    }
  }, [phase, soundEnabled, audioEngine, volume, selectedPattern.audioConfig, setSessionState])

  // ── Audio pause ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'paused') return
    setSessionState('paused')

    // Save accumulated time
    accumulatedRef.current += performance.now() - activeStartRef.current
    if (soundEnabled) {
      audioEngine.pause()
    }
  }, [phase, soundEnabled, audioEngine, setSessionState])

  // ── Elapsed timer ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return

    const interval = setInterval(() => {
      const currentElapsed = accumulatedRef.current + (performance.now() - activeStartRef.current)
      setElapsed(currentElapsed)

      // Check if session should end
      if (currentElapsed >= sessionDuration) {
        accumulatedRef.current = currentElapsed
        setPhase('cooldown')
      }
    }, 200)

    return () => clearInterval(interval)
  }, [phase, sessionDuration])

  // ── Cooldown → Results ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'cooldown') return
    setSessionState('cooldown')
    audioEngine.stop()

    const finalElapsed = accumulatedRef.current
    const completed = finalElapsed >= sessionDuration

    const timer = setTimeout(() => {
      setLastSession({
        patternId: selectedPattern.id,
        patternName: selectedPattern.name,
        elapsed: Math.round(finalElapsed),
        completed,
        timestamp: Date.now(),
      })
      setSessionState('results')
      navigate('/results', { replace: true })
    }, 3000)

    return () => clearTimeout(timer)
  }, [phase, audioEngine, sessionDuration, selectedPattern, setLastSession, setSessionState, navigate])

  // ── HUD auto-hide ──────────────────────────────────────
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

  // ── Guided mode instructions ───────────────────────────
  useEffect(() => {
    if (!guidedMode || phase !== 'active') {
      setCurrentInstruction(null)
      return
    }

    const interval = setInterval(() => {
      const e = accumulatedRef.current + (performance.now() - activeStartRef.current)
      const totalDur = selectedPattern.phases.reduce((sum, p) => sum + p.duration / speed, 0)
      const loopedTime = totalDur > 0 ? e % totalDur : 0

      let acc = 0
      for (const p of selectedPattern.phases) {
        const dur = p.duration / speed
        if (loopedTime < acc + dur) {
          setCurrentInstruction(p.instruction ?? null)
          break
        }
        acc += dur
      }
    }, 500)

    return () => clearInterval(interval)
  }, [guidedMode, phase, selectedPattern, speed])

  // ── Keyboard shortcuts ─────────────────────────────────
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
          handleQuit()
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

  // ── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      audioEngine.stop()
      clearTimeout(hudTimerRef.current)
    }
  }, [audioEngine])

  // ── Handlers ───────────────────────────────────────────

  function handleQuit() {
    audioEngine.stop()
    setSessionState('idle')
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    }
    navigate('/', { replace: true })
  }

  function handlePause() {
    if (phase === 'active') setPhase('paused')
  }

  function handleResume() {
    if (infoOpen) setInfoOpen(false)
    if (phase === 'paused') setPhase('active')
  }

  function handleStop() {
    // Save final elapsed before transitioning
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

  const remaining = Math.max(0, sessionDuration - elapsed)

  // ── Countdown screen ───────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep">
        <div className="text-center">
          <p className="font-heading text-sm tracking-widest text-text-dim uppercase">
            {selectedPattern.name}
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

  // ── Cooldown screen ────────────────────────────────────
  if (phase === 'cooldown') {
    return (
      <div className="fixed inset-0 z-50 bg-bg-deep">
        <SessionPlayer
          pattern={selectedPattern}
          isPlaying={false}
          speed={speed}
          visualScale={visualScale}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-bg-deep/80 transition-opacity duration-[3000ms]">
          <p className="font-body text-lg font-light text-text-muted animate-pulse">
            Session complete
          </p>
        </div>
      </div>
    )
  }

  // ── Active / Paused session ────────────────────────────
  return (
    <div className="fixed inset-0 z-50">
      <SessionPlayer
        pattern={selectedPattern}
        isPlaying={phase === 'active'}
        speed={speed}
        visualScale={visualScale}
        audioEngine={audioEngine}
        soundEnabled={soundEnabled}
        hapticEnabled={hapticEnabled}
      />

      {/* HUD overlay */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          hudVisible || phase === 'paused' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top — pattern name + timer */}
        <div className="pointer-events-auto absolute inset-x-0 top-4 flex items-center justify-center gap-6">
          <span className="font-heading text-sm tracking-widest text-text-dim">
            {selectedPattern.name.toUpperCase()}
          </span>
          {selectedPattern.nameDevanagari && (
            <span className="font-devanagari text-sm text-gold">
              {selectedPattern.nameDevanagari}
            </span>
          )}
          <span className="font-heading text-sm tabular-nums text-turmeric">
            {formatTimer(remaining)}
          </span>
        </div>

        {/* Audio indicator */}
        {soundEnabled && (
          <div className="absolute right-4 top-4 font-heading text-xs text-teal">
            {selectedPattern.audioConfig.mode.toUpperCase()}
            {selectedPattern.requiresHeadphones ? ' \u00B7 headphones' : ''}
          </div>
        )}

        {/* Guided instruction */}
        {guidedMode && currentInstruction && (
          <div className="absolute inset-x-0 bottom-24 flex justify-center px-8">
            <p className="max-w-md rounded-lg bg-bg-deep/60 px-4 py-2 text-center font-body text-sm font-light leading-relaxed text-text-bright/80 backdrop-blur-sm">
              {currentInstruction}
            </p>
          </div>
        )}

        {/* Bottom controls */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
          {/* Info button */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-border-ornament bg-bg-surface/80 text-text-muted hover:text-text-bright"
            onClick={() => { handlePause(); setInfoOpen(true) }}
            aria-label="Pattern info"
          >
            <span className="text-sm">i</span>
          </Button>

          {/* Pause / Resume */}
          {phase === 'paused' ? (
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={handleResume}
            >
              Resume
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
            <p className="font-heading text-2xl tracking-widest text-text-dim">PAUSED</p>
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      {hudVisible && (
        <div className="absolute bottom-6 right-4 hidden rounded-md bg-bg-surface/60 px-3 py-1.5 font-heading text-xs tracking-wide text-text-muted backdrop-blur-sm sm:block">
          SPACE pause &middot; ESC quit &middot; F fullscreen &middot; I info &middot; +/- scale
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
