import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { allPatterns, type PatternConfig } from '@/entities/pattern'
import { SessionPlayer } from '@/widgets/session-player'

export default function HomePage() {
  const [selectedPattern, setSelectedPattern] = useState<PatternConfig>(allPatterns[8]) // pralokita
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  if (isPlaying) {
    return (
      <div className="fixed inset-0 z-50">
        <SessionPlayer
          pattern={selectedPattern}
          isPlaying={isPlaying}
          speed={speed}
        />

        {/* HUD overlay */}
        <div className="absolute inset-x-0 top-4 flex items-center justify-center gap-6">
          <span className="font-heading text-sm tracking-widest text-text-dim">
            {selectedPattern.name.toUpperCase()}
          </span>
          {selectedPattern.nameDevanagari && (
            <span className="font-devanagari text-sm text-gold">
              {selectedPattern.nameDevanagari}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-border-ornament bg-bg-surface/80 text-text-muted hover:text-text-bright"
            onClick={() => setIsPlaying(false)}
          >
            <span className="text-lg">✕</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep px-6 py-8">
      {/* Header */}
      <div className="text-center">
        <p className="font-devanagari text-lg text-gold">दृष्टि भेद</p>
        <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-text-bright">
          Saccada
        </h1>
        <p className="mt-2 font-body text-sm font-light text-text-muted">
          Canvas Animation Engine — Phase 1 Test
        </p>
      </div>

      {/* Speed control */}
      <div className="mx-auto mt-6 flex items-center gap-3">
        <span className="font-heading text-xs tracking-wide text-text-dim">SPEED</span>
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

      {/* Pattern grid */}
      <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {allPatterns.map((p) => {
          const isSelected = p.id === selectedPattern.id
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPattern(p)}
              className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-saffron/50 bg-bg-surface shadow-[0_0_20px_rgba(255,107,53,0.1)]'
                  : 'border-border-ornament bg-bg-mid hover:border-gold/30 hover:bg-bg-surface/60'
              }`}
            >
              {p.nameDevanagari && (
                <span className="font-devanagari text-xs text-gold">
                  {p.nameDevanagari}
                </span>
              )}
              <div className="font-heading text-sm font-semibold text-text-bright">
                {p.name}
              </div>
              <div className="mt-1 font-body text-xs font-light leading-snug text-text-dim">
                {p.trajectory}{p.trajectory !== 'fixation' ? ` · ${p.cycleDuration}ms` : ''}
              </div>
            </button>
          )
        })}
      </div>

      {/* Start button */}
      <div className="mx-auto mt-8">
        <Button size="lg" onClick={() => setIsPlaying(true)}>
          Start {selectedPattern.name}
        </Button>
      </div>

      {/* Preview */}
      <div className="mx-auto mt-6 h-64 w-full max-w-2xl overflow-hidden rounded-xl border border-border-ornament">
        <SessionPlayer
          pattern={selectedPattern}
          isPlaying={true}
          speed={speed}
        />
      </div>
    </div>
  )
}
