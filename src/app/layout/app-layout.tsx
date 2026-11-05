import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import type { Profile } from '@/features/auth/profile'
import { signOut } from '@/features/auth/api'
import { EditProfileName } from '@/features/auth/edit-profile-name'
import { Button } from '@/shared/ui/button'

export function AppLayout({ email, profile, accessError, children, onNameSaved }: {
  email: string | undefined
  profile?: Profile | null
  accessError?: string
  children?: ReactNode
  onNameSaved?: (profile: Profile) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)

  async function handleSignOut() {
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError(null)
    try {
      setError(await signOut())
    } catch {
      setError('Не удалось выйти. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <div className="min-h-svh">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:rounded-lg focus:bg-background focus:p-4">К содержимому</a>
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-wrap items-center gap-4">
          <Link to="/" className="mr-auto rounded-md text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring">CRM</Link>
          <p className="min-w-0 break-words text-sm text-muted-foreground">
            {profile
              ? `${profile.full_name.trim() || email || 'Пользователь'} · ${profile.role === 'manager' ? 'Постановщик' : 'Исполнитель'}`
              : email ?? 'Проверка доступа'}
          </p>
          {profile && !accessError && onNameSaved && <EditProfileName key={profile.id} profile={profile} email={email} onSaved={onNameSaved} />}
          <Button type="button" variant="outline" onClick={handleSignOut} disabled={pending}>
            {pending ? 'Выходим…' : 'Выйти'}
          </Button>
          {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6">
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          {accessError ? <div className="grid justify-items-start gap-4">
            <h1 className="text-xl font-semibold">Проверка доступа</h1>
            <p role="alert" className="text-sm text-destructive">{accessError}</p>
            <Button type="button" onClick={() => window.location.reload()}>Повторить</Button>
          </div> : children}
        </div>
      </main>
    </div>
  )
}
