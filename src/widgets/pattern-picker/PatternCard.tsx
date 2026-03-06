import type { PatternConfig, TrajectoryType } from '@/entities/pattern'

const categoryLabels: Record<string, string> = {
  drishti: 'Drishti Bheda',
  emdr: 'EMDR',
  sleep: 'Sleep',
}

const categoryColors: Record<string, string> = {
  drishti: 'text-gold',
  emdr: 'text-saffron',
  sleep: 'text-indigo',
}

const trajectoryIcons: Record<TrajectoryType, string> = {
  horizontal: '\u2194',
  vertical: '\u2195',
  circular: '\u25CB',
  diagonal: '\u2922',
  figure8: '\u221E',
  fixation: '\u2022',
}

interface PatternCardProps {
  pattern: PatternConfig
  isSelected: boolean
  onSelect: () => void
  onInfo: () => void
}

export function PatternCard({ pattern, isSelected, onSelect, onInfo }: PatternCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-saffron/50 bg-bg-surface shadow-[0_0_20px_rgba(255,107,53,0.1)]'
          : 'border-border-ornament bg-bg-mid hover:border-gold/30 hover:bg-bg-surface/60'
      }`}
    >
      {/* Info button */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onInfo() }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onInfo() } }}
        className="absolute right-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-transparent text-xs text-text-muted/70 transition-all hover:border-border-ornament hover:bg-bg-surface hover:text-text-bright"
        aria-label={`Info about ${pattern.name}`}
      >
        i
      </span>

      {/* Category + Devanagari */}
      <div className="flex items-baseline gap-2">
        <span className={`font-heading text-[10px] tracking-widest uppercase ${categoryColors[pattern.category]}`}>
          {categoryLabels[pattern.category]}
        </span>
        {pattern.nameDevanagari && (
          <span className="font-devanagari text-xs text-gold">
            {pattern.nameDevanagari}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="mt-1 font-heading text-sm font-semibold text-text-bright">
        {pattern.name}
      </div>

      {/* Description */}
      <div className="mt-1 line-clamp-2 font-body text-xs font-light leading-snug text-text-dim">
        {pattern.description}
      </div>

      {/* Bottom row */}
      <div className="mt-2 flex items-center gap-2 text-text-dim">
        <span className="text-sm" title={pattern.trajectory}>
          {trajectoryIcons[pattern.trajectory]}
        </span>
        <span className="font-heading text-[10px] tracking-wider">
          {pattern.audioConfig.mode.toUpperCase()}
        </span>
        {pattern.requiresHeadphones && (
          <span className="text-[10px]" title="Headphones recommended">🎧</span>
        )}
      </div>
    </button>
  )
}
