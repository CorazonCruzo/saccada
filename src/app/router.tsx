import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'
import MoodCheckPage from '@/pages/mood-check/MoodCheckPage'
import SessionPage from '@/pages/session/SessionPage'
import ResultsPage from '@/pages/results/ResultsPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'
import CalibrationPage from '@/pages/calibration/CalibrationPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import NotFoundPage from '@/pages/not-found/NotFoundPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mood-check" element={<MoodCheckPage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/calibration" element={<CalibrationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
