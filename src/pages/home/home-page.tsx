import { useRef, useState } from 'react'

import type { Profile } from '@/features/auth/profile'
import { signOut } from '@/features/auth/api'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function HomePage({ email, profile, accessError }: {
  email: string | undefined
  profile?: Profile | null
  accessError?: string
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
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <Card className="w-full min-w-0 max-w-sm" aria-labelledby="home-title">
        <CardHeader><CardTitle id="home-title">CRM</CardTitle></CardHeader>
        <CardContent className="grid gap-6">
          <p className="break-words text-sm text-muted-foreground">{email ?? (accessError ? 'Проверка доступа' : 'Вы вошли в аккаунт')}</p>
          {profile && <>
            <p className="break-words text-sm">{profile.full_name || 'Имя не указано'}</p>
            <p className="text-sm text-muted-foreground">{profile.role === 'manager' ? 'Постановщик' : 'Исполнитель'}</p>
          </>}
          {accessError && <>
            <p role="alert" className="text-sm text-destructive">{accessError}</p>
            <Button type="button" onClick={() => window.location.reload()}>Повторить</Button>
          </>}
          <Button type="button" variant="outline" onClick={handleSignOut} disabled={pending}>
            {pending ? 'Выходим…' : 'Выйти'}
          </Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
