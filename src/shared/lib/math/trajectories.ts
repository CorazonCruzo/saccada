import type { TrajectoryType, TrajectoryParams } from '@/entities/pattern'
import { applyEasing } from './easing'

export interface Point {
  x: number
  y: number
}

/**
 * Compute normalized position for a given trajectory.
 * @param t - normalized cycle time [0, 1]
 * @param trajectory - trajectory type
 * @param params - amplitude, easing, bias
 * @returns {x, y} in [-1, 1] range (0,0 = center)
 */
export function getTrajectoryPosition(
  t: number,
  trajectory: TrajectoryType,
  params: TrajectoryParams,
): Point {
  const { amplitude, easing, bias } = params

  switch (trajectory) {
    case 'horizontal': {
      const x = applyEasing(t, easing) * amplitude
      return { x, y: 0 }
    }

    case 'vertical': {
      const raw = applyEasing(t, easing) * amplitude
      const biasOffset = bias === 'up' ? -0.25 : bias === 'down' ? 0.25 : 0
      return { x: 0, y: raw + biasOffset }
    }

    case 'circular': {
      const angle = t * Math.PI * 2
      return {
        x: Math.cos(angle) * amplitude,
        y: Math.sin(angle) * amplitude,
      }
    }

    case 'diagonal': {
      const d = applyEasing(t, easing) * amplitude
      return { x: d, y: -d }
    }

    case 'figure8': {
      const angle = t * Math.PI * 2
      return {
        x: Math.sin(angle) * amplitude,
        y: Math.sin(angle * 2) * amplitude * 0.45,
      }
    }

    case 'fixation':
      return { x: 0, y: 0 }
  }
}

/**
 * Convert normalized position [-1, 1] to canvas pixel coordinates.
 */
export function toCanvasCoords(
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
): Point {
  return {
    x: canvasWidth / 2 + point.x * (canvasWidth / 2),
    y: canvasHeight / 2 + point.y * (canvasHeight / 2),
  }
}
