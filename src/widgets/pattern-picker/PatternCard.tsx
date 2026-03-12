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
        className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-gold/40 text-sm font-semibold text-text-muted transition-all hover:border-gold/70 hover:bg-bg-surface hover:text-text-bright"
        aria-label={`Info about ${pattern.name}`}
      >
        i
      </span>

      {/* Category + Devanagari + Name */}
      <div className="pr-10">
        <span className={`font-heading text-xs tracking-widest uppercase ${categoryColors[pattern.category]}`}>
          {categoryLabel}
        </span>
        {pattern.nameDevanagari && (
          <div className="mt-0.5 truncate font-devanagari text-sm text-gold">
            {pattern.nameDevanagari}
          </div>
        )}
        <div className="mt-1.5 font-heading text-lg font-semibold text-text-bright">
          {patternT.name}
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 line-clamp-2 font-body text-sm font-light leading-snug text-text-muted">
        {patternT.description}
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center gap-2 text-text-muted">
        <span className="text-base" title={t.trajectory[pattern.trajectory]}>
          {trajectoryIcons[pattern.trajectory]}
        </span>
        <span className="font-heading text-xs tracking-wider">
          {t.audioMode[pattern.audioConfig.mode].toUpperCase()}
        </span>
        {pattern.requiresHeadphones && (
          <span className="text-xs" title={t.sessionSettings.headphonesRecommended}>{'\uD83C\uDFA7'}</span>
        )}
      </div>
    </button>
  )
}
