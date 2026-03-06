/**
 * Haptic feedback utility. Uses Vibration API.
 * Graceful no-op on iOS and desktop.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

/** Short pulse when dot reaches edge (L/R or top/bottom) */
export function pulseEdge(): void {
  if (canVibrate) navigator.vibrate(15)
}

/** Longer pulse on phase transition */
export function pulseTransition(): void {
  if (canVibrate) navigator.vibrate(40)
}

/**
 * Tracks dot position and fires edge pulses when direction reverses.
 * Call every animation frame with the current normalized position (-1..1).
 */
export function createEdgeDetector() {
  let prevValue = 0
  let prevDirection: 'up' | 'down' | null = null
  const EDGE_THRESHOLD = 0.85

  return function detect(normalizedValue: number): void {
    const direction = normalizedValue > prevValue ? 'up' : 'down'

    if (
      prevDirection !== null &&
      direction !== prevDirection &&
      Math.abs(normalizedValue) > EDGE_THRESHOLD
    ) {
      pulseEdge()
    }

    prevDirection = direction
    prevValue = normalizedValue
  }
}
