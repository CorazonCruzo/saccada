import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SessionRecord } from '@/shared/lib/db'
import { patternsById } from '@/entities/pattern'
import { computeStats, computeStreak, useSessionFilters, buildMonthGrid, prevMonth, nextMonth, isMonthInFuture, computeLongestStreak, colorLevel, type PeriodFilter, type CalendarDay, type MonthGrid } from '@/features/session-history'
import { useWeeklyGoalStore, getWeeklyProgress, getISOWeekStart, getWeeklyGoalStreak } from '@/features/weekly-goal'
import { GoalProgressBar, GoalSettingDialog } from '@/widgets/weekly-goal-widget'
import { groupSessionsByDay, getSessionFocusScore, computeAvgFocusScore } from '@/features/session-history/sessionList'
import { reconstructDotPositions } from '@/shared/lib/math'
import { useTranslation } from '@/shared/lib/i18n'
import { formatTimer } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { t, tp, locale, showDevanagari } = useTranslation()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [showMore, setShowMore] = useState(false)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const nowDate = new Date()
  const [calYear, setCalYear] = useState(nowDate.getFullYear())
  const [calMonth, setCalMonth] = useState(nowDate.getMonth())

  const { weeklyGoal } = useWeeklyGoalStore()

  if (!sessions) return null // loading

  const stats = computeStats(filteredSessions)
  const avgFocus = computeAvgFocusScore(filteredSessions, patternsById)
  const globalStreak = computeStreak(sessions)
  const longestStreak = computeLongestStreak(sessions)
  const weeklyGoalProgress = weeklyGoal ? getWeeklyProgress(sessions, getISOWeekStart()) : 0
  const weeklyGoalStreakVal = weeklyGoal ? getWeeklyGoalStreak(sessions, weeklyGoal) : 0
  const monthGrid = buildMonthGrid(sessions, calYear, calMonth, locale)


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
            className="cursor-pointer font-heading text-base font-semibold tracking-wide text-text-muted transition-colors hover:text-text-bright"
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
                <TabsTrigger value="today">{t.history.periodToday}</TabsTrigger>
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
                          ? 'border-turmeric/60 text-turmeric dark:border-gold/60 dark:text-gold'
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

        {/* Weekly goal */}
        {filteredSessions.length > 0 && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-border-ornament bg-bg-mid px-3 py-2">
            {weeklyGoal != null ? (
              <>
                <button
                  onClick={() => setGoalDialogOpen(true)}
                  className="shrink-0 cursor-pointer font-heading text-[10px] tracking-widest text-text-dim uppercase transition-colors hover:text-text-muted"
                >
                  {t.weeklyGoal.thisWeek}
                </button>
                <div className="flex-1">
                  <GoalProgressBar progress={weeklyGoalProgress} goal={weeklyGoal} />
                </div>
                <span className="shrink-0 font-heading text-xs tabular-nums text-text-bright">
                  {weeklyGoalProgress}/{weeklyGoal}
                </span>
                {weeklyGoalStreakVal > 0 && (
                  <span className="shrink-0 font-heading text-[10px] tabular-nums text-teal">
                    {weeklyGoalStreakVal} {t.weeklyGoal.weeksInRow}
                  </span>
                )}
              </>
            ) : (
              <button
                onClick={() => setGoalDialogOpen(true)}
                className="w-full cursor-pointer text-center font-heading text-xs tracking-wide text-text-dim transition-colors hover:text-text-muted"
              >
                + {t.weeklyGoal.title}
              </button>
            )}
          </div>
        )}
        <GoalSettingDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} />

        {/* Stats */}
        {filteredSessions.length > 0 && (
          <div className="mt-3">
            <div className="grid grid-cols-4 gap-3">
              <StatBlock label={t.history.totalSessions} value={String(stats.totalSessions)} />
              <StatBlock label={t.history.totalTime} value={formatTimer(stats.totalTimeMs)} />
              <StatBlock
                label={t.history.avgFocus}
                value={avgFocus != null ? `${avgFocus}%` : '-'}
              />
              <StatBlock
                label={t.history.streak}
                value={`${globalStreak}${t.history.streakDays}`}
              />
            </div>

            {showMore && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                <StatBlock
                  label={t.history.avgRating}
                  value={stats.avgRating != null ? `${stats.avgRating}` : '-'}
                />
                <StatBlock
                  label={t.history.bestPattern}
                  value={stats.bestPatternId ? (tp(stats.bestPatternId)?.name ?? '-') : '-'}
                />
                <StatBlock
                  label={t.history.completionRate}
                  value={`${stats.completionRate}%`}
                />
                <StatBlock
                  label={t.history.avgDuration}
                  value={formatTimer(stats.avgDurationMs)}
                />
                <StatBlock
                  label={t.history.preferredTime}
                  value={stats.preferredTimeOfDay ? timeOfDayLabel(stats.preferredTimeOfDay, t) : '-'}
                />
              </div>
            )}
            <button
              onClick={() => setShowMore((v) => !v)}
              className="mt-2 w-full cursor-pointer text-center font-heading text-[10px] tracking-widest text-text-dim uppercase transition-colors hover:text-text-muted"
            >
              {showMore ? t.history.showLess : t.history.showMore}
            </button>
          </div>
        )}

        {/* Activity Calendar */}
        {sessions.length > 0 && (
          <ActivityCalendar
            grid={monthGrid}
            selectedDay={selectedDay}
            onDayClick={(date) => {
              if (selectedDay === date) {
                setSelectedDay(null)
                setPeriod('all')
                setCustomRange({ from: '', to: '' })
              } else {
                setSelectedDay(date)
                setPeriod('custom')
                setCustomRange({ from: date, to: date })
              }
            }}
            onPrev={() => { const [y, m] = prevMonth(calYear, calMonth); setCalYear(y); setCalMonth(m) }}
            onNext={() => { const [y, m] = nextMonth(calYear, calMonth); setCalYear(y); setCalMonth(m) }}
            canGoNext={!isMonthInFuture(...nextMonth(calYear, calMonth))}
            currentStreak={globalStreak}
            longestStreak={longestStreak}
            t={t}
            locale={locale}
          />
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

        {/* Session list grouped by day */}
        {filteredSessions.length > 0 && (
          <SessionList
            sessions={filteredSessions}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            deleteId={deleteId}
            onDeleteClick={setDeleteId}
            onDeleteConfirm={handleDelete}
            onDeleteCancel={() => setDeleteId(null)}
            formatDate={formatDate}
            t={t}
            tp={tp}
            locale={locale}
          />
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

type TranslationWithTime = { history: { timeMorning: string; timeAfternoon: string; timeEvening: string; timeNight: string } }

function timeOfDayLabel(key: string, t: TranslationWithTime): string {
  const map: Record<string, string> = {
    morning: t.history.timeMorning,
    afternoon: t.history.timeAfternoon,
    evening: t.history.timeEvening,
    night: t.history.timeNight,
  }
  return map[key] ?? key
}

import type { Translation } from '@/shared/lib/i18n/types'

const WEEKDAY_KEYS = [
  'weekdayMo', 'weekdayTu', 'weekdayWe', 'weekdayTh', 'weekdayFr', 'weekdaySa', 'weekdaySu',
] as const

const LEVEL_COLORS = [
  'var(--saccada-bg-surface)',
  'color-mix(in srgb, var(--saccada-teal) 30%, transparent)',
  'color-mix(in srgb, var(--saccada-teal) 50%, transparent)',
  'color-mix(in srgb, var(--saccada-teal) 70%, transparent)',
  'var(--saccada-teal)',
]

const LEGEND_CELL = 10

interface CalendarProps {
  grid: MonthGrid
  selectedDay: string | null
  onDayClick: (date: string) => void
  onPrev: () => void
  onNext: () => void
  canGoNext: boolean
  currentStreak: number
  longestStreak: number
  t: Translation
  locale: string
}

function ActivityCalendar({
  grid, selectedDay, onDayClick,
  onPrev, onNext, canGoNext,
  currentStreak, longestStreak,
  t, locale,
}: CalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<CalendarDay | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  return (
    <div className="mt-5">
      {/* Header: arrows + month + streak */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            className="cursor-pointer px-1 font-heading text-xs text-text-dim transition-colors hover:text-text-muted"
          >
            {'\u2190'}
          </button>
          <span className="min-w-[120px] text-center font-heading text-xs font-semibold capitalize text-text-bright">
            {grid.label}
          </span>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="cursor-pointer px-1 font-heading text-xs text-text-dim transition-colors hover:text-text-muted disabled:cursor-default disabled:opacity-30"
          >
            {'\u2192'}
          </button>
          {currentStreak > 0 && (
            <>
              <span className="ml-2 font-heading text-xs font-semibold tabular-nums text-teal">
                {currentStreak}{t.history.streakDays}
              </span>
              {longestStreak > currentStreak && (
                <span className="font-heading text-[9px] text-text-dim">
                  ({t.history.longestStreak} {longestStreak})
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Weekday header row */}
      <div className="mx-auto grid max-w-[320px] grid-cols-7">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="py-0.5 text-center font-heading text-[9px] tracking-wide text-text-dim uppercase">
            {t.history[key]}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="relative mx-auto max-w-[320px]">
        {grid.weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (day.isPadding) {
                return <div key={`pad-${wi}-${di}`} style={{ height: 34 }} />
              }

              const level = colorLevel(day.count)

              return (
                <button
                  key={day.date}
                  onClick={() => !day.isFuture && onDayClick(day.date)}
                  onMouseEnter={(e) => {
                    if (!day.isFuture) {
                      setHoveredDay(day)
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top })
                    }
                  }}
                  onMouseLeave={() => { setHoveredDay(null); setTooltipPos(null) }}
                  className={`relative rounded-md transition-colors ${
                    day.isFuture ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    !day.isFuture && day.date === selectedDay
                      ? 'ring-1 ring-text-muted ring-offset-1 ring-offset-bg-deep'
                      : ''
                  }`}
                  style={{
                    height: 34,
                    margin: 2,
                    backgroundColor: day.isFuture
                      ? 'var(--saccada-bg-surface)'
                      : LEVEL_COLORS[level],
                  }}
                >
                  <span className={`absolute inset-0 flex flex-col items-center justify-center font-heading text-[11px] tabular-nums ${
                    day.isFuture
                      ? 'text-text-dim/40'
                      : day.isToday
                        ? `font-semibold ${level >= 2 ? 'text-white' : 'text-text-bright'} ${level >= 3 ? 'dark:text-[#0e0a1a]' : 'dark:text-text-bright'}`
                        : level >= 2
                          ? `text-white ${level >= 3 ? 'dark:text-[#0e0a1a]' : 'dark:text-text-bright'}`
                          : level >= 1
                            ? 'text-text-bright'
                            : 'text-text-dim dark:text-text-muted'
                  }`}>
                    {day.day}
                    {day.isToday && (
                      <span className={`absolute bottom-1 h-1 w-1 rounded-full ${level >= 2 ? 'bg-white' : 'bg-text-bright'} ${level >= 3 ? 'dark:bg-[#0e0a1a]' : 'dark:bg-text-bright'}`} />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        ))}

        {/* Tooltip */}
        {hoveredDay && tooltipPos && (
          <CalendarTooltip day={hoveredDay} pos={tooltipPos} locale={locale} t={t} />
        )}
      </div>

      {/* Legend */}
      <div className="mt-1.5 flex items-center justify-end gap-1">
        <span className="font-heading text-[8px] text-text-dim">{t.history.legendLess}</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={i}
            className="rounded-[2px]"
            style={{ width: LEGEND_CELL, height: LEGEND_CELL, backgroundColor: color }}
          />
        ))}
        <span className="font-heading text-[8px] text-text-dim">{t.history.legendMore}</span>
      </div>
    </div>
  )
}

function CalendarTooltip({
  day, pos, locale, t,
}: {
  day: CalendarDay
  pos: { x: number; y: number }
  locale: string
  t: Translation
}) {
  const dateLabel = day.isToday
    ? t.history.calendarToday
    : new Date(day.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = day.totalTimeMs > 0 ? ` \u00B7 ${formatTimer(day.totalTimeMs)}` : ''

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-md border border-border-ornament bg-bg-mid px-2.5 py-1.5 shadow-lg"
      style={{
        left: pos.x,
        top: pos.y - 8,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <p className="whitespace-nowrap font-heading text-xs text-text-bright">
        {day.count} {day.count === 1 ? t.history.calendarSession : t.history.calendarSessions}{timeStr}
      </p>
      <p className="whitespace-nowrap font-heading text-[9px] text-text-dim">{dateLabel}</p>
    </div>
  )
}

/* ── Session List (grouped by day) ── */

interface SessionListProps {
  sessions: SessionRecord[]
  expandedIds: Set<number>
  onToggleExpand: (id: number) => void
  deleteId: number | null
  onDeleteClick: (id: number) => void
  onDeleteConfirm: (id: number) => void
  onDeleteCancel: () => void
  formatDate: (ts: number) => string
  t: Translation
  tp: (id: string) => { name: string } | undefined
  locale: string
}

function SessionList({
  sessions, expandedIds, onToggleExpand,
  deleteId, onDeleteClick, onDeleteConfirm, onDeleteCancel,
  formatDate, t, tp, locale,
}: SessionListProps) {
  const groups = useMemo(
    () => groupSessionsByDay(sessions, locale, t),
    [sessions, locale, t],
  )

  return (
    <div className="mt-5 space-y-1">
      {groups.map((group) => (
        <div key={group.dateKey}>
          {/* Day separator */}
          <p className="mb-1 mt-3 font-heading text-[10px] tracking-widest text-text-dim uppercase first:mt-0">
            {group.label}
          </p>

          <div className="space-y-2">
            {group.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isExpanded={expandedIds.has(session.id!)}
                onToggle={() => onToggleExpand(session.id!)}
                deleteId={deleteId}
                onDeleteClick={onDeleteClick}
                onDeleteConfirm={onDeleteConfirm}
                onDeleteCancel={onDeleteCancel}
                formatDate={formatDate}
                t={t}
                tp={tp}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SessionCard({
  session, isExpanded, onToggle,
  deleteId, onDeleteClick, onDeleteConfirm, onDeleteCancel,
  formatDate, t, tp,
}: {
  session: SessionRecord
  isExpanded: boolean
  onToggle: () => void
  deleteId: number | null
  onDeleteClick: (id: number) => void
  onDeleteConfirm: (id: number) => void
  onDeleteCancel: () => void
  formatDate: (ts: number) => string
  t: Translation
  tp: (id: string) => { name: string } | undefined
}) {
  const pattern = patternsById[session.patternId]
  const focusScore = useMemo(() => getSessionFocusScore(session, pattern), [session, pattern])
  const hasGaze = session.gazePoints && session.gazePoints.length > 0
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(session.note ?? '')

  async function saveNote() {
    const trimmed = noteText.trim()
    if (session.id != null) {
      await db.sessions.update(session.id, { note: trimmed || undefined })
    }
    setEditingNote(false)
  }

  return (
    <div
      className="cursor-pointer rounded-xl border border-border-ornament bg-bg-mid px-4 py-3 transition-colors hover:border-text-dim/40"
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          {showDevanagari && pattern?.nameDevanagari && (
            <span className="font-devanagari text-xs text-gold">
              {pattern.nameDevanagari}{' '}
            </span>
          )}
          <span className="font-heading text-sm font-semibold text-text-bright">
            {tp(session.patternId)?.name ?? session.patternName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {focusScore != null && (
            <span className="rounded-md bg-teal/15 px-1.5 py-0.5 font-heading text-[10px] tabular-nums text-teal">
              {t.history.focus}: {focusScore}%
            </span>
          )}
          <span className="font-body text-xs text-text-dim">
            {formatDate(session.timestamp)}
          </span>
        </div>
      </div>

      {/* Meta row (min-h-6 prevents height jump when delete confirmation appears) */}
      <div className="mt-2 flex min-h-6 items-center gap-4 font-heading text-xs text-text-muted">
        <span className="tabular-nums text-turmeric">
          {formatTimer(session.elapsed)}
        </span>
        <span className={session.completed ? 'text-teal' : 'text-text-dim'}>
          {session.completed ? t.history.completed : t.history.endedEarly}
        </span>
        {session.reflectionRating != null && (
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => {
              const filled = i < session.reflectionRating!
              return (
                <svg key={i} viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${filled ? 'text-[#be85b0]' : 'text-[#be85b0]/40'}`} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              )
            })}
          </span>
        )}
        <span className="ml-auto">
          {deleteId === session.id ? (
            <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="font-body text-xs text-text-dim">
                {t.history.deleteConfirm}
              </span>
              <Button
                variant="destructive"
                size="xs"
                onClick={() => onDeleteConfirm(session.id!)}
              >
                {t.history.deleteSession}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onDeleteCancel()}
              >
                {t.common.cancel}
              </Button>
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteClick(session.id!) }}
              className="cursor-pointer font-body text-xs text-text-dim transition-colors hover:text-lotus"
            >
              {t.history.deleteSession}
            </button>
          )}
        </span>
      </div>

      {/* Collapsed: show truncated note */}
      {!isExpanded && session.note && (
        <p className="mt-1.5 truncate font-body text-xs font-light text-text-muted">
          {session.note}
        </p>
      )}

      {/* Expanded detail */}
      {isExpanded && (
        <div className="mt-3 border-t border-border-ornament pt-3" onClick={(e) => e.stopPropagation()}>
          {/* Focus Score large + timeline */}
          {focusScore != null && hasGaze && (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-semibold tabular-nums text-teal">
                  {focusScore}%
                </span>
                <span className="font-heading text-xs text-text-dim">{t.history.focus}</span>
              </div>
              <FocusTimelineBar session={session} />
            </div>
          )}

          {/* Editable note */}
          <div className="mb-3">
            {editingNote ? (
              <textarea
                className="w-full rounded-md border border-border-ornament bg-bg-surface px-2 py-1.5 font-body text-xs font-light text-text-bright focus:border-turmeric focus:outline-none"
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={saveNote}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() } }}
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setNoteText(session.note ?? ''); setEditingNote(true) }}
                className="cursor-pointer text-left font-body text-xs font-light text-text-muted transition-colors hover:text-text-bright"
              >
                {session.note || t.history.noNote}
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

interface TimelineSegment {
  ratio: number
  startMs: number
  endMs: number
}

const SEGMENT_COUNT = 40

/** Thin horizontal bar showing on-target (teal) vs off-target (dim) segments. */
function FocusTimelineBar({ session }: { session: SessionRecord }) {
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null)

  const segments = useMemo<TimelineSegment[] | null>(() => {
    if (!session.gazePoints || session.gazePoints.length < 5) return null

    const vw = session.viewportWidth ?? 1000
    const vh = session.viewportHeight ?? 800
    const diagonal = Math.sqrt(vw ** 2 + vh ** 2)
    const threshold = diagonal * 0.25

    const hasRecordedDot = session.gazePoints[0].dotX != null

    // Get dot positions: prefer recorded, fallback to reconstruction
    let getDot: (i: number) => { x: number; y: number }
    if (hasRecordedDot) {
      getDot = (i) => ({
        x: session.gazePoints![i].dotX!,
        y: session.gazePoints![i].dotY!,
      })
    } else {
      const pattern = patternsById[session.patternId]
      if (!pattern) return null
      const timestamps = session.gazePoints.map((p) => p.t)
      const speed = session.speed ?? 1
      const vs = session.visualScale ?? 1
      const dotPositions = reconstructDotPositions(timestamps, pattern, vw, vh, speed, vs)
      getDot = (i) => dotPositions[i]
    }

    const minT = session.gazePoints[0].t
    const maxT = session.gazePoints[session.gazePoints.length - 1].t
    const duration = maxT - minT
    if (duration <= 0) return null

    const segDuration = duration / SEGMENT_COUNT
    const onTarget = new Array(SEGMENT_COUNT).fill(0)
    const counts = new Array(SEGMENT_COUNT).fill(0)

    for (let i = 0; i < session.gazePoints.length; i++) {
      const gaze = session.gazePoints[i]
      const dot = getDot(i)
      const segIdx = Math.min(Math.floor((gaze.t - minT) / segDuration), SEGMENT_COUNT - 1)
      counts[segIdx]++
      const dist = Math.sqrt((gaze.x - dot.x) ** 2 + (gaze.y - dot.y) ** 2)
      if (dist < threshold) onTarget[segIdx]++
    }

    return onTarget.map((on, i) => ({
      ratio: counts[i] > 0 ? on / counts[i] : 0,
      startMs: minT + i * segDuration,
      endMs: minT + (i + 1) * segDuration,
    }))
  }, [session])

  if (!segments) return null

  const hovered = hoveredSeg != null ? segments[hoveredSeg] : null

  return (
    <div className="mt-1.5">
      <div className="flex h-2 gap-px overflow-hidden rounded-full">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex-1 cursor-default rounded-full transition-opacity"
            style={{
              backgroundColor: seg.ratio >= 0.5
                ? `rgba(46,196,182,${0.3 + seg.ratio * 0.7})`
                : 'rgba(90,77,110,0.3)',
              opacity: hoveredSeg != null && hoveredSeg !== i ? 0.4 : 1,
            }}
            onMouseEnter={() => setHoveredSeg(i)}
            onMouseLeave={() => setHoveredSeg(null)}
          />
        ))}
      </div>
      <p className="mt-1 h-3 font-heading text-[9px] tabular-nums text-text-dim">
        {hovered
          ? <>{formatTimer(hovered.startMs)}&ndash;{formatTimer(hovered.endMs)}: {Math.round(hovered.ratio * 100)}%</>
          : '\u00A0'}
      </p>
    </div>
  )
}
