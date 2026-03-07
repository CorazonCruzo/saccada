import { useEffect } from 'react'
import { useLocaleStore } from '@/shared/lib/i18n'
import { AppRouter } from './router'

export function App() {
  const locale = useLocaleStore((s) => s.locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return <AppRouter />
}
