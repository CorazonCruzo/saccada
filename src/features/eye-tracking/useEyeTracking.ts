import { useCallback, useEffect } from 'react'
import { EyeTracker, type GazePoint } from './EyeTracker'

/**
 * Module-level singleton. Survives React component unmount / remount
 * and page navigations. This prevents MediaPipe WASM crash on
 * re-initialization (WebGazer cannot call begin() twice).
 */
let singletonTracker: EyeTracker | null = null

/**
 * Thin React hook wrapping a singleton EyeTracker.
 * The tracker instance persists across page navigations so that
 * WebGazer's WASM module is never torn down and re-created.
 *
 * MediaPipe WASM cannot be restarted after end(). So during normal
 * app lifecycle we only call sleep() (hide video, stop processing).
 * Hard destroy() runs only on page unload.
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
