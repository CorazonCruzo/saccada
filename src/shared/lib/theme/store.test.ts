import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolveTheme, applyTheme } from './store'

describe('resolveTheme', () => {
  it('returns "dark" for mode "dark"', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('returns "light" for mode "light"', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('returns "dark" for mode "system" when OS prefers dark', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList)
    expect(resolveTheme('system')).toBe('dark')
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
  })

  it('returns "light" for mode "system" when OS prefers light', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList)
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('light', 'dark')
    // Ensure a meta theme-color exists
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      meta.setAttribute('content', '')
      document.head.appendChild(meta)
    }
  })

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  it('adds "dark" class and removes "light"', () => {
    document.documentElement.classList.add('light')
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('adds "light" class and removes "dark"', () => {
    document.documentElement.classList.add('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('sets meta theme-color to dark indigo for dark theme', () => {
    applyTheme('dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe('#0e0a1a')
  })

  it('sets meta theme-color to warm cream for light theme', () => {
    applyTheme('light')
    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.getAttribute('content')).toBe('#f5f3f8')
  })
})
