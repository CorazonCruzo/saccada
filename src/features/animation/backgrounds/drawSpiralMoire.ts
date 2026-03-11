/**
 * Spiral Moire -- two logarithmic spirals rotating in opposite
 * directions at slightly different speeds.
 *
 * The interference creates an illusion of pulsation, breathing,
 * expanding and contracting -- the visual language of classic
 * media player visualizations.
 *
 * Pure vector (lineTo), extremely lightweight.
 * Time-based (wallTime), not rotatable.
 */

const ARM_COUNT_A = 12
const ARM_COUNT_B = 11     // different count = beat frequency in the pattern
const TURNS = 4            // how many full revolutions each spiral arm makes
const POINTS_PER_ARM = 200
const SPEED_A = 0.00008    // radians per ms
const SPEED_B = -0.00006   // opposite direction, slightly different speed

function logSpiral(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  armCount: number,
  maxR: number,
  rotation: number,
  growthRate: number,
) {
  const totalAngle = Math.PI * 2 * TURNS
  const step = totalAngle / POINTS_PER_ARM

  for (let arm = 0; arm < armCount; arm++) {
    const armOffset = (arm / armCount) * Math.PI * 2

    ctx.beginPath()
    for (let i = 0; i <= POINTS_PER_ARM; i++) {
      const theta = i * step
      // Logarithmic spiral: r = a * e^(b*theta)
      const r = maxR * (Math.exp(growthRate * theta) - 1) / (Math.exp(growthRate * totalAngle) - 1)
      const angle = theta + armOffset + rotation
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }
}

export function drawSpiralMoire(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallTime: number,
  opacity: number,
  scale: number,
  color1: string,
  color2: string,
) {
  // Fixed base radius: scale (from useAnimationLoop) already accounts for
  // viewport size (min(w,h)/350), so we must NOT also multiply by cx/cy.
  // 160 fills ~90% of the reference 350px preview card.
  const maxR = 160 * scale
  const growthRate = 0.18

  const rotA = wallTime * SPEED_A
  const rotB = wallTime * SPEED_B

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(0.7 * scale, 0.4)

  // Spiral A
  ctx.strokeStyle = color1
  ctx.globalAlpha = opacity * 0.7
  logSpiral(ctx, cx, cy, ARM_COUNT_A, maxR, rotA, growthRate)

  // Spiral B (opposite direction, different arm count)
  ctx.strokeStyle = color2
  ctx.globalAlpha = opacity * 0.5
  logSpiral(ctx, cx, cy, ARM_COUNT_B, maxR, rotB, growthRate)

  ctx.restore()
}
