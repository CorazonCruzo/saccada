import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { patternsById } from '@/entities/pattern'
import { Button } from '@/shared/ui/button'
import { formatTimer } from '@/shared/lib/format'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { lastSession, setSessionState } = useSessionStore()

  if (!lastSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deep px-6">
        <p className="font-body text-base text-text-muted">No session data.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          Go Home
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
            Session Complete
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
          <StatRow label="Duration" value={formatTimer(lastSession.elapsed)} />
          <StatRow
            label="Status"
            value={lastSession.completed ? 'Completed' : 'Ended early'}
            valueColor={lastSession.completed ? 'text-teal' : 'text-turmeric'}
          />
          {pattern && (
            <>
              <StatRow label="Pattern" value={pattern.trajectory} />
              <StatRow label="Audio" value={pattern.audioConfig.mode} />
            </>
          )}
        </div>

        {/* Heatmap placeholder (Phase 6) */}
        <div className="mt-6 flex h-32 items-center justify-center rounded-xl border border-border-ornament bg-bg-mid">
          <p className="font-body text-xs font-light text-text-dim">
            Gaze heatmap will appear here
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={handleRepeat}>
            Repeat Session
          </Button>
          <Button variant="outline" className="w-full" onClick={handleNewSession}>
            New Session
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
