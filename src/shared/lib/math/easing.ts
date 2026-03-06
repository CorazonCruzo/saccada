import type { EasingType } from '@/entities/pattern'

/** Apply easing to a normalized time value t ∈ [0, 1] */
export function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'linear':
      return t
    case 'sine':
      return Math.sin(t * Math.PI * 2)
    case 'ease-in-out':
      return -(Math.cos(Math.PI * t) - 1) / 2
  }
}
