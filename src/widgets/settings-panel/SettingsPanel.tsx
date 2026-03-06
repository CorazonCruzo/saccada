import { useSessionStore } from '@/entities/session'
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
    hapticEnabled, toggleHaptic,
    guidedMode, toggleGuided,
    visualScale, setVisualScale,
  } = useSessionStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border-ornament bg-bg-mid sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-text-bright">
            Session Settings
          </DialogTitle>
          {selectedPattern.nameDevanagari && (
            <p className="font-devanagari text-sm text-gold">{selectedPattern.nameDevanagari}</p>
          )}
          <p className="font-body text-sm font-light text-text-muted">
            {selectedPattern.name} &middot; {selectedPattern.trajectory}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Duration */}
          <div>
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs tracking-widest text-text-dim uppercase">Duration</span>
              <span className="font-heading text-sm text-turmeric">{formatDurationLabel(sessionDuration)}</span>
            </div>
            <Slider
              value={[sessionDuration]}
              onValueChange={([v]) => setSessionDuration(v)}
              min={30_000}
              max={600_000}
              step={30_000}
              className="mt-2"
            />
          </div>

          {/* Speed */}
          <div>
            <span className="font-heading text-xs tracking-widest text-text-dim uppercase">Speed</span>
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
              <span className="font-heading text-xs tracking-widest text-text-dim uppercase">Visual Scale</span>
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
              Mandala, bindu and flame size. Also +/- during session.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {/* Sound */}
            <ToggleRow
              label="Sound"
              icon={'\u266A'}
              active={soundEnabled}
              activeColor="saffron"
              onToggle={toggleSound}
            />

            {/* Volume — shown when sound on */}
            {soundEnabled && (
              <div className="flex items-center gap-2 pl-6">
                <span className="font-heading text-xs tracking-wide text-text-dim">VOL</span>
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
                <span>🎧</span>
                <span className="font-body font-light text-indigo">Headphones recommended</span>
              </div>
            )}

            {/* Haptic */}
            <ToggleRow
              label="Haptic"
              icon={'\u3030'}
              active={hapticEnabled}
              activeColor="teal"
              onToggle={toggleHaptic}
            />

            {/* Guided */}
            <ToggleRow
              label="Guided"
              icon={'\u2630'}
              active={guidedMode}
              activeColor="turmeric"
              onToggle={toggleGuided}
            />

            {/* Eye tracking — disabled */}
            <div className="flex items-center gap-2 opacity-40">
              <span className="text-base text-text-dim">{'\u25CE'}</span>
              <span className="font-heading text-sm font-semibold tracking-wide text-text-dim">
                Eye Tracking
              </span>
              <span className="ml-auto font-body text-[10px] font-light text-text-dim">
                Coming soon
              </span>
            </div>
          </div>

          {/* Start button */}
          <Button size="lg" className="w-full" onClick={onStart}>
            Begin Session
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
