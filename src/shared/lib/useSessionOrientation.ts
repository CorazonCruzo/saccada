import { useState, useEffect, useRef } from 'react'
import { isMobileDevice, isPortrait, tryLockLandscape } from './orientation'

/**
 * Hook for session flow pages (session, calibration).
 * On mobile: tries to lock landscape via Fullscreen + ScreenOrientation API.
 * If lock fails (iOS), returns `needsRotation = true` when portrait,
 * so the page can show a RotateDeviceOverlay.
 *
 * Does NOT unlock on unmount — the lock persists across page navigations
 * within the session flow. Call `unlockOrientation()` explicitly at flow end.
 */
export function useSessionOrientation() {
  const isMobile = useRef(isMobileDevice())
  const lockSucceeded = useRef(false)
  const [needsRotation, setNeedsRotation] = useState(false)

  useEffect(() => {
    if (!isMobile.current) return

    // Try the lock (Android fullscreen + orientation.lock)
    tryLockLandscape().then((locked) => {
      lockSucceeded.current = locked
      if (!locked && isPortrait()) {
        setNeedsRotation(true)
      }
    })

    // Listen for orientation changes (iOS fallback: user rotates manually)
    const mql = window.matchMedia('(orientation: portrait)')

    function handleChange() {
      if (lockSucceeded.current) return // lock handled it
      setNeedsRotation(window.matchMedia('(orientation: portrait)').matches)
    }

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return { needsRotation, isMobile: isMobile.current }
}
