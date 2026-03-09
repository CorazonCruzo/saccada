import { useState, useMemo } from 'react'
import type { SessionRecord } from '@/shared/lib/db'

export type PeriodFilter = 'today' | 'week' | 'month' | 'all' | 'custom'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

export interface SessionFilters {
  period: PeriodFilter
  customRange: DateRange
  selectedPatternIds: Set<string>
  filteredSessions: SessionRecord[]
  availablePatterns: Array<{ id: string; name: string }>
  hasActiveFilters: boolean
  setPeriod: (p: PeriodFilter) => void
  setCustomRange: (r: DateRange) => void
  togglePattern: (patternId: string) => void
  clearPatternFilter: () => void
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekAgoStr(): string {
  const d = new Date(Date.now() - 7 * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useSessionFilters(sessions: SessionRecord[]): SessionFilters {
  const [period, setPeriod] = useState<PeriodFilter>('today')
  const [customRange, setCustomRange] = useState<DateRange>({ from: weekAgoStr(), to: todayStr() })
  const [selectedPatternIds, setSelectedPatternIds] = useState<Set<string>>(new Set())

  const availablePatterns = useMemo(() => {
    const seen = new Map<string, string>()
    for (const s of sessions) {
      if (!seen.has(s.patternId)) {
        seen.set(s.patternId, s.patternName)
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [sessions])

  // Stable key for set dependency
  const patternKey = useMemo(
    () => Array.from(selectedPatternIds).sort().join(','),
    [selectedPatternIds],
  )

  const filteredSessions = useMemo(() => {
    return filterSessions(sessions, period, customRange, selectedPatternIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, period, customRange.from, customRange.to, patternKey])

  const hasActiveFilters = period !== 'today' || selectedPatternIds.size > 0

  function togglePattern(patternId: string) {
    setSelectedPatternIds((prev) => {
      const next = new Set(prev)
      if (next.has(patternId)) {
        next.delete(patternId)
      } else {
        next.add(patternId)
      }
      return next
    })
  }

  function clearPatternFilter() {
    setSelectedPatternIds(new Set())
  }

  return {
    period,
    customRange,
    selectedPatternIds,
    filteredSessions,
    availablePatterns,
    hasActiveFilters,
    setPeriod,
    setCustomRange,
    togglePattern,
    clearPatternFilter,
  }
}

/** Pure filtering logic, exported for testing */
export function filterSessions(
  sessions: SessionRecord[],
  period: PeriodFilter,
  customRange: DateRange,
  selectedPatternIds: Set<string>,
): SessionRecord[] {
  let result = sessions

  // Period filter
  if (period === 'today') {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const cutoff = todayStart.getTime()
    result = result.filter((s) => s.timestamp >= cutoff)
  } else if (period === 'week') {
    const cutoff = Date.now() - 7 * 86400000
    result = result.filter((s) => s.timestamp >= cutoff)
  } else if (period === 'month') {
    const cutoff = Date.now() - 30 * 86400000
    result = result.filter((s) => s.timestamp >= cutoff)
  } else if (period === 'custom') {
    const from = customRange.from ? new Date(customRange.from + 'T00:00:00').getTime() : 0
    const to = customRange.to ? new Date(customRange.to + 'T23:59:59.999').getTime() : Infinity
    result = result.filter((s) => s.timestamp >= from && s.timestamp <= to)
  }

  // Pattern filter
  if (selectedPatternIds.size > 0) {
    result = result.filter((s) => selectedPatternIds.has(s.patternId))
  }

  return result
}
