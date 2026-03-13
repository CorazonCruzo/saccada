import type { PatternConfig, TrajectoryType } from '@/entities/pattern'
import { useTranslation } from '@/shared/lib/i18n'
import { HeadphonesIcon } from '@/shared/ui/headphones-icon'

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
      className={`group flex h-full cursor-pointer flex-col rounded-xl border p-5 text-left transition-all ${
        isSelected
          ? 'border-turmeric/50 bg-bg-surface shadow-[0_0_20px_var(--saccada-turmeric)]/10'
          : 'border-border-ornament bg-bg-mid shadow-sm hover:border-gold/30 hover:bg-bg-surface/60'
      }`}
    >
      {/* Top row: category + meta */}
      <div className="flex items-start justify-between gap-2">
        <span className={`font-heading text-xs tracking-widest uppercase ${categoryColors[pattern.category]}`}>
          {categoryLabel}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-text-muted">
          <span className="text-sm" title={t.trajectory[pattern.trajectory]}>
            {trajectoryIcons[pattern.trajectory]}
          </span>
          <span className="font-heading text-[10px] tracking-wider">
            {t.audioMode[pattern.audioConfig.mode].toUpperCase()}
          </span>
          {pattern.requiresHeadphones && (
            <HeadphonesIcon className="h-3.5 w-3.5 text-indigo" />
          )}
        </div>
      </div>

      {/* Name + Devanagari */}
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-heading text-lg font-semibold text-text-bright">
          {patternT.name}
        </span>
        {pattern.nameDevanagari && (
          <span className="truncate font-devanagari text-sm text-gold">
            {pattern.nameDevanagari}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mt-2 line-clamp-2 font-body text-sm font-light leading-snug text-text-muted">
        {patternT.description}
      </div>

      {/* Show more link — pushed to bottom */}
      <span
        role="link"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onInfo() }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onInfo() } }}
        className="mt-auto pt-1.5 inline-block font-body text-xs text-teal transition-colors hover:text-teal/80"
      >
        {t.common.showMore}
      </span>
    </button>
  )
}
