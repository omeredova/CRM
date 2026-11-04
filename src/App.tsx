import { Route, Routes } from 'react-router'

import { LoginPage } from '@/pages/login/login-page'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<main className="min-h-svh" />} />
    </Routes>
  )
}

export default App
