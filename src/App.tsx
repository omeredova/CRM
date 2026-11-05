import { Navigate, Route, Routes } from 'react-router'

import { AppLayout } from '@/app/layout/app-layout'
import { useAuthSession } from '@/features/auth/use-auth-session'
import { HomePage } from '@/pages/home/home-page'
import { LoginPage } from '@/pages/login/login-page'
import { ObjectPage } from '@/pages/object/object-page'

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
    return <AppLayout email={session?.user.email} accessError={error} />
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={session && profile ? <AppLayout email={session.user.email} profile={profile}><HomePage key={`${profile.id}:${profile.role}`} role={profile.role} /></AppLayout> : <Navigate to="/login" replace />} />
      <Route path="/objects" element={<Navigate to={session ? '/' : '/login'} replace />} />
      <Route path="/objects/:id" element={session && profile ? <AppLayout email={session.user.email} profile={profile}><ObjectPage key={profile.id} /></AppLayout> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App
