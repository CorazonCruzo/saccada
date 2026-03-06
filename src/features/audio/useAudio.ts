import { useRef, useEffect } from 'react'
import { AudioEngine } from './AudioEngine'

/** Singleton audio engine instance, shared across the app */
let sharedEngine: AudioEngine | null = null

function getEngine(): AudioEngine {
  if (!sharedEngine) {
    sharedEngine = new AudioEngine()
  }
  return sharedEngine
}

/**
 * Thin React hook wrapping AudioEngine.
 * Handles cleanup on unmount.
 */
export function useAudio() {
  const engineRef = useRef(getEngine())

  useEffect(() => {
    return () => {
      engineRef.current.stop()
    }
  }, [])

  return engineRef.current
}
