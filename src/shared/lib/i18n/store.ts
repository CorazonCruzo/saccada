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
  return 'en'
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: detectBrowserLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'saccada-locale' },
  ),
)
