import type { BackgroundPatternId } from '@/entities/pattern'
import { drawMandala } from '../drawMandala'
import { drawAura } from './drawAura'
import { drawRipples } from './drawRipples'
import { drawFibonacci } from './drawFibonacci'
import { drawSeedOfLife } from './drawSeedOfLife'
import { drawFlowerOfLife } from './drawFlowerOfLife'
import { drawMetatronsCube } from './drawMetatronsCube'

/**
 * Dispatch to the correct background drawing function.
 * Each background receives the params it needs from the common interface.
 */
export function drawBackground(
  id: BackgroundPatternId,
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  wallTime: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
  binduColor: string,
) {
  switch (id) {
    case 'zen':
      return
    case 'aura':
      return drawAura(ctx, cx, cy, wallTime, opacity, scale, binduColor)
    case 'ripples':
      return drawRipples(ctx, cx, cy, wallTime, opacity, scale, color1, color2)
    case 'fibonacci':
      return drawFibonacci(ctx, cx, cy, angle, opacity, scale, color1)
    case 'seed-of-life':
      return drawSeedOfLife(ctx, cx, cy, angle, opacity, scale, color1, color2)
    case 'mandala':
      return drawMandala(ctx, cx, cy, angle, opacity, scale, color1, color2)
    case 'flower-of-life':
      return drawFlowerOfLife(ctx, cx, cy, angle, opacity, scale, color1, color2)
    case 'metatrons-cube':
      return drawMetatronsCube(ctx, cx, cy, angle, opacity, scale, color1, color2)
  }
}
