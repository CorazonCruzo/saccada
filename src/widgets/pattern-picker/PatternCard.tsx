import type { PatternConfig, TrajectoryType } from '@/entities/pattern'
import { useTranslation } from '@/shared/lib/i18n'

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
  const { t, tp } = useTranslation()
  const patternT = tp(pattern.id)
  const categoryLabel = t.categories[pattern.category as keyof typeof t.categories] ?? pattern.category

  const categoryColors: Record<string, string> = {
    drishti: 'text-gold',
    emdr: 'text-saffron',
    sleep: 'text-indigo',
  }

  return (
    <button
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-xl border p-5 text-left transition-all ${
        isSelected
          ? 'border-turmeric/50 bg-bg-surface shadow-[0_0_20px_var(--saccada-turmeric)]/10'
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
          {categoryLabel}
        </span>
        {pattern.nameDevanagari && (
          <span className="font-devanagari text-xs text-gold">
            {pattern.nameDevanagari}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="mt-1.5 font-heading text-base font-semibold text-text-bright">
        {patternT.name}
      </div>

      {/* Description */}
      <div className="mt-1.5 line-clamp-2 font-body text-xs font-light leading-snug text-text-muted">
        {patternT.description}
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center gap-2 text-text-muted">
        <span className="text-sm" title={t.trajectory[pattern.trajectory]}>
          {trajectoryIcons[pattern.trajectory]}
        </span>
        <span className="font-heading text-[10px] tracking-wider">
          {t.audioMode[pattern.audioConfig.mode].toUpperCase()}
        </span>
        {pattern.requiresHeadphones && (
          <span className="text-[10px]" title={t.sessionSettings.headphonesRecommended}>{'\uD83C\uDFA7'}</span>
        )}
      </div>
    </button>
  )
}
