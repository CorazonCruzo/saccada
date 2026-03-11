import type { EasingType } from '@/entities/pattern'

/**
 * Apply easing to a normalized time value t ∈ [0, 1].
 * All easing functions return values in [-1, +1] range,
 * producing a full oscillation over one cycle.
 */
export function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'linear':
      // Triangle wave: constant speed, sharp reversal at edges.
      // -1 → 0 → +1 → 0 → -1
      return 1 - 4 * Math.abs(t - 0.5)
    case 'sine':
      // Smooth sinusoidal oscillation.
      // 0 → +1 → 0 → -1 → 0
      return Math.sin(t * Math.PI * 2)
    case 'ease-in-out':
      // Cosine oscillation: lingers at edges, fast through center.
      // Mimics EMDR therapist finger — brief pause at each side.
      // -1 → 0 → +1 → 0 → -1
      return -Math.cos(t * Math.PI * 2)
  }
}
