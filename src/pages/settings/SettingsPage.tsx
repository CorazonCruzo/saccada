import { useNavigate } from 'react-router-dom'
import { useTranslation, useLocaleStore, locales, localeNames } from '@/shared/lib/i18n'
import type { Locale } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { locale, setLocale } = useLocaleStore()

  return (
    <div className="flex min-h-screen flex-col bg-bg-deep px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-text-bright">
            {t.settingsPage.title}
          </h1>
          <button
            onClick={() => navigate('/')}
            className="cursor-pointer font-body text-sm font-light text-text-dim transition-colors hover:text-text-muted"
          >
            {t.common.back}
          </button>
        </div>

        <div className="mt-8 space-y-6">
          {/* Language */}
          <section>
            <h2 className="font-heading text-xs tracking-widest text-turmeric uppercase">
              {t.settingsPage.language}
            </h2>
            <div className="mt-3 flex gap-2">
              {locales.map((loc: Locale) => (
                <Button
                  key={loc}
                  variant={locale === loc ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLocale(loc)}
                >
                  {localeNames[loc]}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
