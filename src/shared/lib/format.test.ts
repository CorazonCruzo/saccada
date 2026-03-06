import { describe, it, expect } from 'vitest'
import { formatTimer, formatDurationLabel } from './format'

describe('formatTimer', () => {
  it('formats zero', () => {
    expect(formatTimer(0)).toBe('0:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTimer(5000)).toBe('0:05')
    expect(formatTimer(30000)).toBe('0:30')
    expect(formatTimer(59000)).toBe('0:59')
  })

  it('formats minutes and seconds', () => {
    expect(formatTimer(60000)).toBe('1:00')
    expect(formatTimer(90000)).toBe('1:30')
    expect(formatTimer(125000)).toBe('2:05')
    expect(formatTimer(600000)).toBe('10:00')
  })

  it('handles negative values as zero', () => {
    expect(formatTimer(-5000)).toBe('0:00')
  })

  it('floors fractional milliseconds', () => {
    expect(formatTimer(61500)).toBe('1:01')
    expect(formatTimer(999)).toBe('0:00')
    expect(formatTimer(1000)).toBe('0:01')
  })
})

describe('formatDurationLabel', () => {
  it('formats seconds only', () => {
    expect(formatDurationLabel(30000)).toBe('30s')
    expect(formatDurationLabel(45000)).toBe('45s')
  })

  it('formats whole minutes', () => {
    expect(formatDurationLabel(60000)).toBe('1m')
    expect(formatDurationLabel(120000)).toBe('2m')
    expect(formatDurationLabel(600000)).toBe('10m')
  })

  it('formats minutes and seconds', () => {
    expect(formatDurationLabel(90000)).toBe('1m 30s')
    expect(formatDurationLabel(150000)).toBe('2m 30s')
  })

  it('handles zero', () => {
    expect(formatDurationLabel(0)).toBe('0s')
  })
})
