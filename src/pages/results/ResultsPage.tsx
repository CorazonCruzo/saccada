import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/entities/session'
import { patternsById } from '@/entities/pattern'
import { HeatmapViewer } from '@/widgets/heatmap-viewer'
import { getSessionFocusScore } from '@/features/session-history/sessionList'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { formatTimer } from '@/shared/lib/format'
import { db, type SessionRecord } from '@/shared/lib/db'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { lastSession, setLastSession, setSessionState } = useSessionStore()
  const { t, tp } = useTranslation()
  const heatmapContainerRef = useRef<HTMLDivElement>(null)
  const [gazeMapOpen, setGazeMapOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const savedRef = useRef(false)

  // Save session to Dexie once on mount
  useEffect(() => {
    if (!lastSession || savedRef.current) return
    savedRef.current = true
    db.sessions.add({
      patternId: lastSession.patternId,
      patternName: lastSession.patternName,
      elapsed: lastSession.elapsed,
      completed: lastSession.completed,
      timestamp: lastSession.timestamp,
      moodBefore: lastSession.moodBefore,
      moodAfter: lastSession.moodAfter,
      gazePoints: lastSession.gazePoints,
      viewportWidth: lastSession.viewportWidth,
      viewportHeight: lastSession.viewportHeight,
      speed: lastSession.speed,
      visualScale: lastSession.visualScale,
    }).catch((err) => console.error('[Saccada] Failed to save session:', err))
  }, [lastSession])

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
  const focusScore = useMemo(
    () => getSessionFocusScore(lastSession as SessionRecord, pattern),
    [lastSession, pattern],
  )

  function handleNewSession() {
    setSessionState('idle')
    navigate('/')
  }

  function handleRepeat() {
    setSessionState('mood-check-before')
    navigate('/mood-check?phase=before')
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
            {tp(lastSession.patternId)?.name ?? lastSession.patternName}
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
          {focusScore != null && (
            <div className="flex items-center justify-between border-b border-border-ornament/50 pb-2">
              <span className="font-heading text-xs tracking-widest text-text-dim uppercase">
                {t.history.focus}
              </span>
              <span className="font-heading text-lg font-semibold tabular-nums text-teal">
                {focusScore}%
              </span>
            </div>
          )}
          {(lastSession.moodBefore != null || lastSession.moodAfter != null) && (
            <MoodChangeRow
              before={lastSession.moodBefore}
              after={lastSession.moodAfter}
              t={t}
            />
          )}
        </div>

        {/* Heatmap */}
        {hasGaze ? (
          <div className="mt-6">
            {gazeMapOpen ? (
              <>
                <button
                  onClick={() => setGazeMapOpen(false)}
                  className="mb-2 flex w-full cursor-pointer items-center justify-between"
                >
                  <span className="font-heading text-xs tracking-widest text-text-dim uppercase">
                    {t.results.heatmapTitle}
                  </span>
                  <span className="font-body text-xs text-text-muted hover:text-text-bright">
                    {t.results.hideGazeMap}
                  </span>
                </button>
                <div
                  ref={heatmapContainerRef}
                  className="overflow-hidden rounded-xl border border-border-ornament bg-bg-mid"
                  style={{ aspectRatio: '16 / 9' }}
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
              </>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setGazeMapOpen(true)}
              >
                {t.results.showGazeMap}
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-1.5 text-text-dim">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <span className="font-body text-xs">{t.results.heatmapPlaceholder}</span>
          </div>
        )}

        {/* Note */}
        <div className="mt-6">
          {noteOpen ? (
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={() => {
                if (noteText.trim() && lastSession) {
                  const updated = { ...lastSession, note: noteText.trim() }
                  setLastSession(updated)
                  // Update the Dexie record too
                  db.sessions
                    .where('timestamp').equals(lastSession.timestamp)
                    .modify({ note: noteText.trim() })
                    .catch(() => {})
                }
              }}
              placeholder={t.results.notePlaceholder}
              className="w-full resize-none rounded-lg border border-border-ornament bg-bg-mid px-3 py-2 font-body text-sm font-light text-text-bright placeholder:text-text-dim focus:border-teal focus:outline-none"
              rows={3}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setNoteOpen(true)}
              className="w-full cursor-pointer rounded-lg border border-dashed border-input px-3 py-2 text-center font-body text-xs text-text-muted transition-colors hover:border-turmeric/60 hover:text-text-bright"
            >
              {t.results.addNote}
            </button>
          )}
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

/**
 * Compute mood change display values.
 * Scale: 1 = calm (good) .. 5 = restless (bad). Decrease = improvement.
 */
export function computeMoodChange(before?: number, after?: number) {
  const hasBoth = before != null && after != null
  const diff = hasBoth ? after! - before! : 0
  const direction: 'improved' | 'worsened' | 'same' =
    diff < 0 ? 'improved' : diff > 0 ? 'worsened' : 'same'
  const color = diff < 0 ? 'text-teal' : diff > 0 ? 'text-lotus' : 'text-text-muted'
  const arrow = diff < 0 ? '\u2191' : diff > 0 ? '\u2193' : ''
  return { hasBoth, diff, direction, color, arrow }
}

function MoodChangeRow({
  before,
  after,
  t,
}: {
  before?: number
  after?: number
  t: { results: { moodChange: string; moodImproved: string; moodSame: string; moodWorse: string } }
}) {
  const { hasBoth, direction, color, arrow } = computeMoodChange(before, after)
  const label =
    direction === 'improved' ? t.results.moodImproved
    : direction === 'worsened' ? t.results.moodWorse
    : t.results.moodSame

  return (
    <div className="flex items-center justify-between border-b border-border-ornament/50 pb-2">
      <span className="font-heading text-xs tracking-widest text-text-dim uppercase">
        {t.results.moodChange}
      </span>
      <span className="flex items-center gap-2">
        {before != null && (
          <span className="font-heading text-sm text-text-muted">{before}</span>
        )}
        {hasBoth && (
          <>
            <span className="text-text-dim">{'\u2192'}</span>
            <span className={`font-heading text-sm font-bold ${color}`}>{after}</span>
            <span className={`font-heading text-xs ${color}`}>
              {arrow} {label}
            </span>
          </>
        )}
        {!hasBoth && after != null && (
          <span className={`font-heading text-sm ${color}`}>{after}</span>
        )}
      </span>
    </div>
  )
}
