import { useState, useEffect } from 'react'
import { useSessionStore } from '@/entities/session'
import { useTranslation } from '@/shared/lib/i18n'

export function SensitivityNotice() {
  const { sensitivityDismissed, setSensitivityDismissed } = useSessionStore()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!sensitivityDismissed) {
      const timer = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [sensitivityDismissed])

  function handleDismiss(permanent: boolean) {
    setFadeOut(true)
    if (permanent) setSensitivityDismissed(true)
    setTimeout(() => setVisible(false), 300)
  }

  if (!visible || sensitivityDismissed) return null

  return (
    <div
      className={`fixed right-4 bottom-6 z-[150] transition-opacity duration-300 sm:right-6 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="max-w-xs rounded-lg border border-turmeric/40 bg-bg-canvas/80 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-turmeric/30">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-sm">{'\u26A0\uFE0F'}</span>
          <div>
            <p className="font-heading text-xs font-semibold tracking-wide text-turmeric">
              {t.preSession.sensitivityWarning}
            </p>
            <p className="mt-1 font-body text-xs leading-relaxed text-text-bright/80">
              {t.preSession.sensitivityDetails}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              onChange={(e) => { if (e.target.checked) handleDismiss(true) }}
              className="accent-turmeric"
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
