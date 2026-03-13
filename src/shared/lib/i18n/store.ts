import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from './types'

interface LocaleStore {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export function detectBrowserLocale(): Locale {
  const lang = navigator.language.slice(0, 2)
  if (lang === 'ru') return 'ru'
  if (lang === 'es') return 'es'
  if (lang === 'de') return 'de'
  if (lang === 'fr') return 'fr'
  if (lang === 'pt') return 'pt'
  if (lang === 'ja') return 'ja'
  if (lang === 'hi') return 'hi'
  if (lang === 'ta') return 'ta'
  if (lang === 'zh') return 'zh'
  return 'en'
}

function syncHtmlLang(locale: Locale) {
  document.documentElement.lang = locale
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale) => {
        syncHtmlLang(locale)
        set({ locale })
      },
    }),
    { name: 'saccada-locale' },
  ),
)

// Sync html lang on initial load (after rehydration from localStorage)
syncHtmlLang(useLocaleStore.getState().locale)
