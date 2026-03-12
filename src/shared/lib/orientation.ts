/**
 * Mobile orientation utilities for session flow.
 *
 * Session flow should be in landscape on mobile devices.
 * Android: fullscreen + orientation lock.
 * iOS: show "rotate your device" overlay (no lock API).
 */

/** Minimum viewport dimension to consider device "mobile" for orientation lock */
const MOBILE_MAX_WIDTH = 1024

/** Check if the device is likely a mobile phone or small tablet */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    Math.min(window.innerWidth, window.innerHeight) < MOBILE_MAX_WIDTH
  )
}

/** Check if the device is currently in portrait orientation */
export function isPortrait(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(orientation: portrait)').matches
}

/**
 * Try to lock the screen to landscape orientation.
 * Requires fullscreen on Android. Returns true if the lock succeeded.
 * On iOS this will always return false (no lock API in Safari).
 */
export async function tryLockLandscape(): Promise<boolean> {
  try {
    // Fullscreen is required for orientation lock on Android
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    }
    // screen.orientation.lock is not available on all browsers
    if (screen.orientation && 'lock' in screen.orientation) {
      await (screen.orientation as unknown as { lock(orientation: string): Promise<void> }).lock('landscape')
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Unlock orientation and exit fullscreen.
 * Safe to call even if not locked/fullscreen.
 */
export async function unlockOrientation(): Promise<void> {
  try {
    if (screen.orientation && 'unlock' in screen.orientation) {
      screen.orientation.unlock()
    }
  } catch { /* ignore */ }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  } catch { /* ignore */ }
}
