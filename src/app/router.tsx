import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'
import SessionPage from '@/pages/session/SessionPage'
import ResultsPage from '@/pages/results/ResultsPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </BrowserRouter>
  )
}
