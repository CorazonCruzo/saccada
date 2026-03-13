import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isHintDismissed, dismissHint, isDesktop, isMobile, isPortrait } from './hints'

const STORAGE_KEY = 'saccada_dismissed_hints'

describe('hints', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('isHintDismissed', () => {
    it('returns false when no hints dismissed', () => {
      expect(isHintDismissed('hint_eye_tracking')).toBe(false)
    })

    it('returns false for undismissed hint', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['hint_session_controls']))
      expect(isHintDismissed('hint_eye_tracking')).toBe(false)
    })

    it('returns true for dismissed hint', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['hint_eye_tracking']))
      expect(isHintDismissed('hint_eye_tracking')).toBe(true)
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json')
      expect(isHintDismissed('hint_eye_tracking')).toBe(false)
    })
  })

  describe('dismissHint', () => {
    it('adds hint to dismissed set', () => {
      dismissHint('hint_eye_tracking')
      expect(isHintDismissed('hint_eye_tracking')).toBe(true)
    })

    it('preserves previously dismissed hints', () => {
      dismissHint('hint_eye_tracking')
      dismissHint('hint_session_controls')
      expect(isHintDismissed('hint_eye_tracking')).toBe(true)
      expect(isHintDismissed('hint_session_controls')).toBe(true)
    })

    it('does not duplicate when dismissing same hint twice', () => {
      dismissHint('hint_eye_tracking')
      dismissHint('hint_eye_tracking')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as string[]
      expect(stored.filter(id => id === 'hint_eye_tracking')).toHaveLength(1)
    })
  })

  describe('screen size helpers', () => {
    it('isDesktop returns true for wide screens', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
      expect(isDesktop()).toBe(true)
    })

    it('isDesktop returns false for narrow screens', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768)
      expect(isDesktop()).toBe(false)
    })

    it('isMobile returns true for narrow screens', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
      expect(isMobile()).toBe(true)
    })

    it('isMobile returns false for wide screens', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024)
      expect(isMobile()).toBe(false)
    })

    it('isPortrait returns true when height > width', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375)
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(812)
      expect(isPortrait()).toBe(true)
    })

    it('isPortrait returns false when width > height', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
      expect(isPortrait()).toBe(false)
    })
  })
})
