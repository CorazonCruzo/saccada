/**
 * 7-step segmented progress bar with progressive teal coloring.
 * Each filled segment gets a progressively more saturated teal,
 * matching the calendar heatmap aesthetic.
 */

/**
 * 7 color steps matching the calendar heatmap:
 *   calendar levels 1-4: .3 / .5 / .7 / 1.0
 *   extended to 7 steps for full week coverage
 */
const SEGMENT_COLORS = [
  'rgba(46,196,182,0.25)',  // 1
  'rgba(46,196,182,0.35)',  // 2
  'rgba(46,196,182,0.45)',  // 3
  'rgba(46,196,182,0.55)',  // 4
  'rgba(46,196,182,0.70)',  // 5
  'rgba(46,196,182,0.85)',  // 6
  '#2ec4b6',                // 7 — full teal (same as calendar level 4)
] as const

const EMPTY_COLOR = 'rgba(90,77,110,0.18)'

interface GoalProgressBarProps {
  progress: number
  goal: number
}

export function GoalProgressBar({ progress, goal }: GoalProgressBarProps) {
  const filled = Math.min(progress, goal)
  const maxIdx = SEGMENT_COLORS.length - 1

  return (
    <div className="flex h-1.5 gap-0.5">
      {Array.from({ length: goal }, (_, i) => (
        <div
          key={i}
          className="flex-1 transition-colors duration-300"
          style={{
            backgroundColor: i < filled
              ? SEGMENT_COLORS[Math.round(((i + 1) / goal) * maxIdx)]
              : EMPTY_COLOR,
            borderRadius: i === 0
              ? '9999px 0 0 9999px'
              : i === goal - 1
                ? '0 9999px 9999px 0'
                : '0',
          }}
        />
      ))}
    </div>
  )
}
