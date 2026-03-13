import { useState, useEffect, useCallback } from 'react'
import { type HintId, isHintDismissed, dismissHint } from '@/shared/lib/hints'
import { useTranslation } from '@/shared/lib/i18n'

interface ContextualHintProps {
  id: HintId
  /** Show condition (checked on mount). Hint won't render if false or already dismissed. */
  show: boolean
  /** Position on screen */
  position?: 'top' | 'bottom' | 'center'
  /** Auto-dismiss after N ms (0 = no auto-dismiss) */
  timeoutMs?: number
  /** Content override. If not provided, uses i18n key `hints.<id>` */
  children?: React.ReactNode
}

export function ContextualHint({ id, show, position = 'bottom', timeoutMs = 0, children }: ContextualHintProps) {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const { t } = useTranslation()

  const close = useCallback(() => {
    setFadeOut(true)
    dismissHint(id)
    setTimeout(() => setVisible(false), 300)
  }, [id])

  useEffect(() => {
    if (show && !isHintDismissed(id)) {
      // Small delay so hint doesn't flash on instant page transitions
      const timer = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(timer)
    }
  }, [show, id])

  useEffect(() => {
    if (visible && timeoutMs > 0) {
      const timer = setTimeout(close, timeoutMs)
      return () => clearTimeout(timer)
    }
  }, [visible, timeoutMs, close])

  if (!visible) return null

  const content = children ?? (t.hints as Record<string, string>)?.[id]
  if (!content) return null

  const posClass =
    position === 'top' ? 'top-[20%] inset-x-0' :
    position === 'center' ? 'inset-0 flex items-center justify-center' :
    'bottom-20 inset-x-0'

  return (
    <div
      className={`pointer-events-none fixed z-[150] px-4 transition-opacity duration-300 ${posClass} ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className="pointer-events-auto mx-auto max-w-[85vw] rounded-lg border border-gold/40 bg-bg-canvas/70 px-3.5 py-2.5 backdrop-blur-sm dark:border-indigo/40 sm:max-w-md sm:px-6 sm:py-3"
        onClick={close}
        role="status"
      >
        <p className="text-center font-body text-xs font-light leading-relaxed text-text-bright/90 sm:text-sm">
          {content}
        </p>
        <button
          onClick={close}
          className="mt-1.5 block w-full cursor-pointer text-center font-heading text-[10px] font-bold tracking-wider text-text-muted transition-colors hover:text-text-bright sm:mt-2 sm:text-xs"
        >
          OK
        </button>
      </div>
    </div>
  )
}
