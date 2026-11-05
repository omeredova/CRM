import { Navigate, Route, Routes } from 'react-router'

import { AppLayout } from '@/app/layout/app-layout'
import { useAuthSession } from '@/features/auth/use-auth-session'
import { HomePage } from '@/pages/home/home-page'
import { LoginPage } from '@/pages/login/login-page'
import { ObjectPage } from '@/pages/object/object-page'
import { TaskPage } from '@/pages/task/task-page'
import { TasksPage } from '@/pages/tasks/tasks-page'

function App() {
  const { session, profile, loading, error, updateProfileName } = useAuthSession()

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
      <Route path="/" element={session && profile ? <AppLayout email={session.user.email} profile={profile} onNameSaved={updateProfileName}><HomePage key={`${profile.id}:${profile.role}`} role={profile.role} /></AppLayout> : <Navigate to="/login" replace />} />
      <Route path="/objects" element={<Navigate to={session ? '/' : '/login'} replace />} />
      <Route path="/objects/:id" element={session && profile ? <AppLayout email={session.user.email} profile={profile} onNameSaved={updateProfileName}><ObjectPage key={profile.id} role={profile.role} /></AppLayout> : <Navigate to="/login" replace />} />
      <Route path="/tasks" element={session && profile ? (profile.role === 'executor' ? <AppLayout email={session.user.email} profile={profile} onNameSaved={updateProfileName}><TasksPage key={profile.id} userId={profile.id} /></AppLayout> : <Navigate to="/" replace />) : <Navigate to="/login" replace />} />
      <Route path="/tasks/:id" element={session && profile ? <AppLayout email={session.user.email} profile={profile} onNameSaved={updateProfileName}><TaskPage key={`${profile.id}:${profile.role}`} user={profile} /></AppLayout> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App
