import { useLocaleStore } from './store'
import { translations } from './translations'
import type { Translation, PatternTranslation } from './types'

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  const t: Translation = translations[locale]

  function tp(patternId: string): PatternTranslation {
    return t.pattern[patternId]
  }

  const showDevanagari = locale !== 'hi'

  return { t, tp, locale, showDevanagari }
}
