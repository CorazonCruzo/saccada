import { useEffect } from 'react'
import { useLocaleStore } from '@/shared/lib/i18n'
import { useThemeStore, resolveTheme, applyTheme } from '@/shared/lib/theme'
import { AppRouter } from './router'

export function App() {
  const locale = useLocaleStore((s) => s.locale)
  const themeMode = useThemeStore((s) => s.mode)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Apply theme class to <html> and update meta theme-color
  useEffect(() => {
    const resolved = resolveTheme(themeMode)
    applyTheme(resolved)

    // If system mode, listen for OS preference changes
    if (themeMode !== 'system') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      applyTheme(resolveTheme('system'))
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [themeMode])

  return <AppRouter />
}
