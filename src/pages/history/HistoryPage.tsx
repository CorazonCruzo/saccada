import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/shared/lib/db'
import { patternsById } from '@/entities/pattern'
import { computeStats, useSessionFilters, type PeriodFilter } from '@/features/session-history'
import { computeMoodChange } from '@/pages/results/ResultsPage'
import { useTranslation } from '@/shared/lib/i18n'
import { formatTimer } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { t, tp, locale } = useTranslation()
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const sessions = useLiveQuery(
    () => db.sessions.orderBy('timestamp').reverse().toArray(),
    [],
  )

  const filters = useSessionFilters(sessions ?? [])
  const {
    period, setPeriod,
    customRange, setCustomRange,
    selectedPatternIds, togglePattern,
    filteredSessions, availablePatterns,
  } = filters

  if (!sessions) return null // loading

  const stats = computeStats(filteredSessions)

  async function handleDelete(id: number) {
    await db.sessions.delete(id)
    setDeleteId(null)
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-text-bright">
            {t.history.title}
          </h1>
          <button
            onClick={() => navigate('/')}
            className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
          >
            {t.common.back}
          </button>
        </div>

        {/* Filters (only if there are any sessions) */}
        {sessions.length > 0 && (
          <div className="mt-5">
            {/* Period tabs */}
            <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <TabsList variant="line">
                <TabsTrigger value="week">{t.history.periodWeek}</TabsTrigger>
                <TabsTrigger value="month">{t.history.periodMonth}</TabsTrigger>
                <TabsTrigger value="all">{t.history.periodAll}</TabsTrigger>
                <TabsTrigger value="custom">{t.history.periodCustom}</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Custom date range */}
            {period === 'custom' && (
              <div className="mt-3 flex items-center gap-2">
                <label className="font-heading text-xs tracking-wide text-text-dim uppercase">
                  {t.history.customFrom}
                </label>
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                  className="rounded-md border border-border-ornament bg-bg-surface px-2 py-1 font-body text-sm text-text-bright focus:border-turmeric focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
                <label className="font-heading text-xs tracking-wide text-text-dim uppercase">
                  {t.history.customTo}
                </label>
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                  className="rounded-md border border-border-ornament bg-bg-surface px-2 py-1 font-body text-sm text-text-bright focus:border-turmeric focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}

            {/* Pattern chips */}
            {availablePatterns.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {availablePatterns.map(({ id }) => {
                  const isActive = selectedPatternIds.size === 0 || selectedPatternIds.has(id)
                  return (
                    <button
                      key={id}
                      onClick={() => togglePattern(id)}
                      className={`cursor-pointer rounded-full border px-2.5 py-0.5 font-heading text-xs tracking-wide transition-colors ${
                        isActive
                          ? 'border-turmeric/60 text-turmeric'
                          : 'border-border-ornament text-text-dim hover:text-text-muted'
                      }`}
                    >
                      {tp(id)?.name ?? id}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {filteredSessions.length > 0 && (
          <div className="mt-5 grid grid-cols-4 gap-3">
            <StatBlock label={t.history.totalSessions} value={String(stats.totalSessions)} />
            <StatBlock label={t.history.totalTime} value={formatTimer(stats.totalTimeMs)} />
            <StatBlock
              label={t.history.mostUsed}
              value={stats.mostUsedPatternId ? (tp(stats.mostUsedPatternId)?.name ?? stats.mostUsedPatternName ?? '-') : '-'}
            />
            <StatBlock
              label={t.history.streak}
              value={`${stats.streak}${t.history.streakDays}`}
            />
          </div>
        )}

        {/* Empty state: no sessions ever */}
        {sessions.length === 0 && (
          <div className="mt-16 text-center">
            <p className="font-body text-sm font-light text-text-muted">
              {t.history.empty}
            </p>
          </div>
        )}

        {/* Empty state: filters match nothing */}
        {sessions.length > 0 && filteredSessions.length === 0 && (
          <div className="mt-12 text-center">
            <p className="font-body text-sm font-light text-text-muted">
              {t.history.noResults}
            </p>
          </div>
        )}

        {/* Session list */}
        {filteredSessions.length > 0 && (
          <div className="mt-5 space-y-3">
            {filteredSessions.map((session) => {
              const pattern = patternsById[session.patternId]
              const { hasBoth, color, arrow } = computeMoodChange(session.moodBefore, session.moodAfter)

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-border-ornament bg-bg-mid px-4 py-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {pattern?.nameDevanagari && (
                        <span className="font-devanagari text-xs text-gold">
                          {pattern.nameDevanagari}{' '}
                        </span>
                      )}
                      <span className="font-heading text-sm font-semibold text-text-bright">
                        {tp(session.patternId)?.name ?? session.patternName}
                      </span>
                    </div>
                    <span className="font-body text-xs text-text-dim">
                      {formatDate(session.timestamp)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-4 font-heading text-xs text-text-muted">
                    <span className="tabular-nums text-turmeric">
                      {formatTimer(session.elapsed)}
                    </span>
                    <span className={session.completed ? 'text-teal' : 'text-text-dim'}>
                      {session.completed ? t.history.completed : t.history.endedEarly}
                    </span>
                    {hasBoth && (
                      <span className={color}>
                        {session.moodBefore} {'\u2192'} {session.moodAfter} {arrow}
                      </span>
                    )}
                    {!hasBoth && session.moodBefore != null && (
                      <span className="text-text-dim">{session.moodBefore}</span>
                    )}
                  </div>

                  {session.note && (
                    <p className="mt-1.5 font-body text-xs font-light text-text-muted">
                      {session.note}
                    </p>
                  )}

                  {/* Delete */}
                  <div className="mt-2 flex justify-end">
                    {deleteId === session.id ? (
                      <div className="flex items-center gap-2">
                        <span className="font-body text-xs text-text-dim">
                          {t.history.deleteConfirm}
                        </span>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleDelete(session.id!)}
                        >
                          {t.history.deleteSession}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDeleteId(null)}
                        >
                          {t.common.cancel}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(session.id!)}
                        className="cursor-pointer font-body text-xs text-text-dim transition-colors hover:text-lotus"
                      >
                        {t.history.deleteSession}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-ornament bg-bg-mid px-3 py-2 text-center">
      <p className="font-heading text-sm font-semibold tabular-nums text-text-bright">{value}</p>
      <p className="mt-0.5 font-heading text-[10px] tracking-widest text-text-dim uppercase">{label}</p>
    </div>
  )
}
