import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/home/HomePage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
