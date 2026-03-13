/**
 * Contextual hints system.
 * One-time hints that appear at specific moments.
 * Dismissed hint IDs stored in localStorage.
 */

const STORAGE_KEY = 'saccada_dismissed_hints'

export type HintId =
  | 'hint_eye_tracking'
  | 'hint_session_controls'
  | 'hint_post_session'
  | 'hint_advanced_settings'
  | 'hint_landscape_mobile'

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function isHintDismissed(id: HintId): boolean {
  return getDismissed().has(id)
}

export function dismissHint(id: HintId): void {
  const dismissed = getDismissed()
  dismissed.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]))
}

export function isDesktop(): boolean {
  return window.innerWidth >= 1024
}

export function isMobile(): boolean {
  return window.innerWidth < 768
}

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth
}
