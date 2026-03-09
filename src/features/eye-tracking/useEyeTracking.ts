import { useCallback, useEffect } from 'react'
import { EyeTracker, type GazePoint } from './EyeTracker'

/**
 * Module-level singleton. Survives React component unmount / remount
 * and page navigations. Prevents MediaPipe WASM double-initialization.
 */
let singletonTracker: EyeTracker | null = null

/**
 * Thin React hook wrapping a singleton EyeTracker.
 * The tracker instance persists across page navigations so that
 * the MediaPipe pipeline is never torn down and re-created.
 *
 * During normal app lifecycle we only call sleep() (hide video, stop
 * processing). Hard destroy() runs only on page unload.
 */
export function useEyeTracking() {
  const getTracker = useCallback(() => {
    if (!singletonTracker) {
      singletonTracker = new EyeTracker()
    }
    return singletonTracker
  }, [])

  /** Hide video + stop gaze processing. Camera stays on for reuse. */
  const sleep = useCallback(() => {
    singletonTracker?.sleep()
  }, [])

  /** Hard destroy on page unload only. */
  useEffect(() => {
    const handleUnload = () => {
      singletonTracker?.destroy()
      singletonTracker = null
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return { getTracker, sleep }
}

export type { GazePoint }
