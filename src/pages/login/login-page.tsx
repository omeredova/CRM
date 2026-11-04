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
  return (
    <main className="flex min-h-svh items-center justify-center p-4 sm:p-6">
      <Card className="w-full min-w-0 max-w-sm" aria-labelledby="login-title">
        <CardHeader>
          <CardTitle id="login-title">Вход в аккаунт</CardTitle>
          <CardDescription>
            Введите электронную почту и пароль для входа в CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="login-email">Электронная почта</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
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
                autoComplete="current-password"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="button" className="w-full">Войти</Button>
        </CardFooter>
      </Card>
    </main>
  )
}
