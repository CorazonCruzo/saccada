import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/shared/lib/db'
import { patternsById } from '@/entities/pattern'
import { computeStats, computeStreak, useSessionFilters, buildMonthGrid, prevMonth, nextMonth, isMonthInFuture, computeLongestStreak, colorLevel, toDateKey, type PeriodFilter, type CalendarDay, type MonthGrid } from '@/features/session-history'
import { computeMoodChange } from '@/pages/results/ResultsPage'
import { useTranslation } from '@/shared/lib/i18n'
import { formatTimer } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { t, tp, locale } = useTranslation()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [showMore, setShowMore] = useState(false)

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

  if (!sessions) return null // loading

  const stats = computeStats(filteredSessions)
  const globalStreak = computeStreak(sessions)
  const longestStreak = computeLongestStreak(sessions)
  const streakActive = globalStreak > 0
  const hasSessionToday = sessions.some((s) => toDateKey(s.timestamp) === toDateKey(Date.now()))
  const monthGrid = buildMonthGrid(sessions, calYear, calMonth, locale)

  // If a calendar day is selected, narrow the session list to that day
  const displayedSessions = selectedDay
    ? filteredSessions.filter((s) => toDateKey(s.timestamp) === selectedDay)
    : filteredSessions

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
          <div className="mt-5">
            <div className="grid grid-cols-4 gap-3">
              <StatBlock label={t.history.totalSessions} value={String(stats.totalSessions)} />
              <StatBlock label={t.history.totalTime} value={formatTimer(stats.totalTimeMs)} />
              <StatBlock
                label={t.history.avgMoodChange}
                value={stats.avgMoodChange != null ? formatMoodChange(stats.avgMoodChange) : '-'}
              />
              <StatBlock
                label={t.history.streak}
                value={`${globalStreak}${t.history.streakDays}`}
              />
            </div>
            {showMore && (
              <div className="mt-3 grid grid-cols-4 gap-3">
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
            onDayClick={(date) => setSelectedDay(selectedDay === date ? null : date)}
            onPrev={() => { const [y, m] = prevMonth(calYear, calMonth); setCalYear(y); setCalMonth(m) }}
            onNext={() => { const [y, m] = nextMonth(calYear, calMonth); setCalYear(y); setCalMonth(m) }}
            canGoNext={!isMonthInFuture(...nextMonth(calYear, calMonth))}
            currentStreak={globalStreak}
            longestStreak={longestStreak}
            streakActive={streakActive}
            hasSessionToday={hasSessionToday}
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

        {/* Session list */}
        {displayedSessions.length > 0 && (
          <div className="mt-5 space-y-3">
            {displayedSessions.map((session) => {
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

function formatMoodChange(avg: number): string {
  if (avg > 0) return `+${avg}`
  if (avg < 0) return String(avg)
  return '0'
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
  '#1a1035',            // 0: bg-mid (no sessions)
  'rgba(46,196,182,.3)', // 1: teal 30%
  'rgba(46,196,182,.5)', // 2: teal 50%
  'rgba(46,196,182,.7)', // 3: teal 70%
  '#2ec4b6',             // 4: teal 100%
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
  streakActive: boolean
  hasSessionToday: boolean
  t: Translation
  locale: string
}

function ActivityCalendar({
  grid, selectedDay, onDayClick,
  onPrev, onNext, canGoNext,
  currentStreak, longestStreak, streakActive, hasSessionToday,
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
                    day.isToday && day.date === selectedDay
                      ? 'ring-2 ring-text-bright'
                      : day.isToday
                        ? 'ring-2 ring-text-muted'
                        : !day.isFuture && day.date === selectedDay
                          ? 'ring-1 ring-text-muted ring-offset-1 ring-offset-bg-deep'
                          : ''
                  }`}
                  style={{
                    height: 34,
                    margin: 2,
                    backgroundColor: day.isFuture
                      ? '#231a42'
                      : LEVEL_COLORS[level],
                  }}
                >
                  <span className={`absolute inset-0 flex items-center justify-center font-heading text-[11px] tabular-nums ${
                    day.isToday
                      ? 'font-semibold text-text-bright'
                      : day.isFuture
                        ? 'text-text-dim/40'
                        : level >= 1
                          ? 'text-text-bright'
                          : 'text-text-dim'
                  }`}>
                    {day.day}
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
