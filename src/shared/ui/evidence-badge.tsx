import type { EvidenceLevel } from '@/entities/pattern'
import { useTranslation } from '@/shared/lib/i18n'

const levelStyles: Record<EvidenceLevel, string> = {
  researched: 'border-teal/50 text-teal bg-teal/10',
  preliminary: 'border-turmeric/50 text-turmeric bg-turmeric/10',
  hypothesis: 'border-text-muted/40 text-text-muted bg-text-muted/10',
}

const levelIcons: Record<EvidenceLevel, string> = {
  researched: '\u2713',
  preliminary: '\u25CB',
  hypothesis: '?',
}

interface EvidenceBadgeProps {
  level: EvidenceLevel
  size?: 'sm' | 'md'
}

export function EvidenceBadge({ level, size = 'sm' }: EvidenceBadgeProps) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-heading tracking-wide ${levelStyles[level]} ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      }`}
    >
      <span>{levelIcons[level]}</span>
      <span>{t.evidenceLevel[level]}</span>
    </span>
  )
}
