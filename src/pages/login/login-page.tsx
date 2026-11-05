import { useRef, useState, type FormEvent } from 'react'

import { signIn } from '@/features/auth/api'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function LoginPage() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = new FormData(event.currentTarget)
    const email = form.get('email')
    const password = form.get('password')
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      setError('Введите электронную почту и пароль.')
      return
    }

    submitting.current = true
    setPending(true)
    setError(null)
    try {
      setError(await signIn(email, password))
    } catch {
      setError('Не удалось войти. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <Card className="w-full min-w-0 max-w-sm" aria-labelledby="login-title">
        <CardHeader>
          <CardTitle id="login-title">Вход в аккаунт</CardTitle>
          <CardDescription>
            Введите электронную почту и пароль для входа в CRM.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" aria-busy={pending}>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="login-email">Электронная почта</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  disabled={pending}
                  aria-describedby={error ? 'login-error' : undefined}
                  autoComplete="username"
                  placeholder="name@example.com"
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="login-password">Пароль</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  disabled={pending}
                  aria-describedby={error ? 'login-error' : undefined}
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && (
              <p id="login-error" role="alert" className="mt-4 text-sm text-destructive">{error}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Входим…' : 'Войти'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
