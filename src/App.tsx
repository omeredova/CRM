import { Navigate, Route, Routes } from 'react-router'

import { useAuthSession } from '@/features/auth/use-auth-session'
import { HomePage } from '@/pages/home/home-page'
import { LoginPage } from '@/pages/login/login-page'

function App() {
  const { session, profile, loading, error } = useAuthSession()

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <p role="status" className="text-sm text-muted-foreground">Проверяем сессию…</p>
      </main>
    )
  }

  if (error) {
    return <HomePage email={session?.user.email} accessError={error} />
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={session ? <HomePage email={session.user.email} profile={profile} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App
