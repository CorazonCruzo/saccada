import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { patternsById } from '@/entities/pattern'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { formatTimer } from '@/shared/lib/format'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { lastSession, setSessionState } = useSessionStore()
  const { t } = useTranslation()

  if (!lastSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6">
        <p className="font-body text-base text-text-muted">{t.results.noData}</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          {t.common.goHome}
        </Button>
      </div>
    )
  }

  const pattern = patternsById[lastSession.patternId]

  function handleNewSession() {
    setSessionState('idle')
    navigate('/')
  }

  function handleRepeat() {
    navigate('/session')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center">
          <p className="font-heading text-xs tracking-widest text-text-dim uppercase">
            {t.results.title}
          </p>
          {pattern?.nameDevanagari && (
            <p className="mt-2 font-devanagari text-xl text-gold">{pattern.nameDevanagari}</p>
          )}
          <h1 className="mt-1 font-heading text-3xl font-bold text-text-bright">
            {lastSession.patternName}
          </h1>
        </div>

        {/* Stats */}
        <div className="mt-8 space-y-4">
          <StatRow label={t.results.duration} value={formatTimer(lastSession.elapsed)} />
          <StatRow
            label={t.results.status}
            value={lastSession.completed ? t.results.completed : t.results.endedEarly}
            valueColor={lastSession.completed ? 'text-teal' : 'text-turmeric'}
          />
          {pattern && (
            <>
              <StatRow label={t.results.pattern} value={t.trajectory[pattern.trajectory]} />
              <StatRow label={t.results.audio} value={t.audioMode[pattern.audioConfig.mode]} />
            </>
          )}
        </div>

        {/* Heatmap placeholder (Phase 6) */}
        <div className="mt-6 flex h-32 items-center justify-center rounded-xl border border-border-ornament bg-bg-mid">
          <p className="font-body text-xs font-light text-text-dim">
            {t.results.heatmapPlaceholder}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={handleRepeat}>
            {t.results.repeatSession}
          </Button>
          <Button variant="outline" className="w-full" onClick={handleNewSession}>
            {t.results.newSession}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  valueColor = 'text-text-bright',
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-border-ornament/50 pb-2">
      <span className="font-heading text-xs tracking-widest text-text-dim uppercase">{label}</span>
      <span className={`font-heading text-sm ${valueColor}`}>{value}</span>
    </div>
  )
}
