import { supabase } from '@/shared/api/supabase'

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (!error) return null
  if (error.code === 'invalid_credentials') return 'Неверная электронная почта или пароль.'
  if (error.status === 429) return 'Слишком много попыток. Попробуйте позже.'
  return 'Не удалось войти. Попробуйте позже.'
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  return error ? 'Не удалось выйти. Попробуйте ещё раз.' : null
}
