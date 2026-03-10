import { useTranslation } from '@/shared/lib/i18n'

/**
 * Fullscreen overlay shown on mobile when the device is in portrait
 * and we couldn't lock orientation programmatically (iOS).
 * Asks the user to rotate their device to landscape.
 */
export function RotateDeviceOverlay() {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-bg-deep px-8">
      {/* Rotate phone icon */}
      <svg
        viewBox="0 0 64 64"
        width="64"
        height="64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-turmeric"
      >
        {/* Phone outline (portrait) */}
        <rect x="18" y="8" width="28" height="48" rx="4" />
        {/* Screen */}
        <rect x="22" y="14" width="20" height="36" rx="1" opacity="0.3" />
        {/* Rotation arrow */}
        <path
          d="M52 32 a20 20 0 0 1-10 17.3"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M42 49.3 l2-5 l-5 1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p className="mt-6 text-center font-heading text-lg font-bold text-text-bright">
        {t.session.rotateLandscape}
      </p>
      <p className="mt-2 max-w-xs text-center font-body text-sm font-light text-text-muted">
        {t.session.rotateLandscapeHint}
      </p>
    </div>
  )
}
