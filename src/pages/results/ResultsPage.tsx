import { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { patternsById } from '@/entities/pattern'
import { HeatmapViewer } from '@/widgets/heatmap-viewer'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { formatTimer } from '@/shared/lib/format'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { lastSession, setSessionState } = useSessionStore()
  const { t } = useTranslation()
  const heatmapContainerRef = useRef<HTMLDivElement>(null)

  const handleExportPng = useCallback(() => {
    const canvas = heatmapContainerRef.current?.querySelector('canvas')
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `saccada-heatmap-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [])

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
  const hasGaze = lastSession.gazePoints && lastSession.gazePoints.length > 0

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
          {hasGaze && (
            <StatRow label={t.results.gazePoints} value={String(lastSession.gazePoints!.length)} />
          )}
        </div>

        {/* Heatmap */}
        {hasGaze ? (
          <div className="mt-6">
            <p className="mb-2 font-heading text-xs tracking-widest text-text-dim uppercase">
              {t.results.heatmapTitle}
            </p>
            <div
              ref={heatmapContainerRef}
              className="overflow-hidden rounded-xl border border-border-ornament bg-bg-mid"
              style={{ aspectRatio: `${lastSession.viewportWidth ?? 16} / ${lastSession.viewportHeight ?? 9}` }}
            >
              <HeatmapViewer
                gazePoints={lastSession.gazePoints!}
                sourceWidth={lastSession.viewportWidth}
                sourceHeight={lastSession.viewportHeight}
                className="h-full w-full"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full text-xs"
              onClick={handleExportPng}
            >
              {t.results.exportPng}
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="mb-2 font-heading text-xs tracking-widest text-text-dim uppercase">
              {t.results.heatmapTitle}
            </p>
            <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border-ornament bg-bg-mid">
              {/* Decorative disabled heatmap */}
              <div className="absolute inset-0 opacity-15">
                <div className="absolute left-[20%] top-[30%] h-16 w-20 rounded-full bg-indigo blur-xl" />
                <div className="absolute left-[45%] top-[40%] h-12 w-16 rounded-full bg-teal blur-lg" />
                <div className="absolute left-[65%] top-[25%] h-10 w-14 rounded-full bg-turmeric blur-xl" />
                <div className="absolute left-[35%] top-[55%] h-8 w-12 rounded-full bg-indigo blur-lg" />
              </div>
              <p className="relative z-10 max-w-[200px] text-center font-body text-xs font-light leading-relaxed text-text-muted">
                {t.results.enableCameraHint}
              </p>
            </div>
          </div>
        )}

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
