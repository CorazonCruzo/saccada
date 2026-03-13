import { useState, useEffect } from 'react'
import { isDesktop, isHintDismissed, dismissHint } from '@/shared/lib/hints'
import { useTranslation } from '@/shared/lib/i18n'

export function EyeTrackingNotice() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (isDesktop() && !isHintDismissed('hint_eye_tracking_notice')) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleDismiss(permanent: boolean) {
    setFadeOut(true)
    if (permanent) dismissHint('hint_eye_tracking_notice')
    setTimeout(() => setVisible(false), 300)
  }

  if (!visible) return null

  return (
    <div
      className={`transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="max-w-xs rounded-lg border border-teal/40 bg-bg-canvas/80 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-teal/30">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-sm">{'\u25CE'}</span>
          <p className="font-body text-xs leading-relaxed text-text-bright/80">
            {t.hints.hint_eye_tracking}
          </p>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              onChange={(e) => { if (e.target.checked) handleDismiss(true) }}
              className="accent-teal"
            />
            <span className="font-body text-[10px] text-text-dim">{t.preSession.dontShowAgain}</span>
          </label>
          <button
            onClick={() => handleDismiss(false)}
            className="cursor-pointer font-heading text-xs font-bold tracking-wider text-text-muted transition-colors hover:text-text-bright"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
