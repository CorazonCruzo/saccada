const FALLBACK_RING1 = '#c4956a'
const FALLBACK_RING2 = '#e8a838'

/** Read current mandala ring colors from CSS custom properties */
export function readMandalaColors(): [string, string] {
  const style = getComputedStyle(document.documentElement)
  const c1 = style.getPropertyValue('--saccada-mandala-ring1').trim()
  const c2 = style.getPropertyValue('--saccada-mandala-ring2').trim()
  return [c1 || FALLBACK_RING1, c2 || FALLBACK_RING2]
}
