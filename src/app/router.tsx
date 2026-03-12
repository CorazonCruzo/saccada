import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'
import SessionPage from '@/pages/session/SessionPage'
import ReflectionPage from '@/pages/reflection/ReflectionPage'
import ResultsPage from '@/pages/results/ResultsPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'
import CalibrationPage from '@/pages/calibration/CalibrationPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import HistoryPage from '@/pages/history/HistoryPage'
import AboutPage from '@/pages/about/AboutPage'
import NotFoundPage from '@/pages/not-found/NotFoundPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/reflection" element={<ReflectionPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/calibration" element={<CalibrationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
