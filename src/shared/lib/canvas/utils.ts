/** Set up a canvas for HiDPI rendering. Returns the CSS size used. */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): { dpr: number } {
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  return { dpr }
}
