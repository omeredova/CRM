import type { SupabaseClient } from '@supabase/supabase-js'

export type CrmRole = 'manager' | 'executor'
export type Profile = {
  id: string
  full_name: string
  first_name: string
  last_name: string
  name_set_at: string | null
  role: CrmRole
}
type ProfileResult =
  | { profile: Profile; error: null }
  | { profile: null; error: string }

export function isProfile(row: unknown): row is Profile {
  return typeof row === 'object' && row !== null &&
    'id' in row && typeof row.id === 'string' &&
    'full_name' in row && typeof row.full_name === 'string' &&
    'first_name' in row && typeof row.first_name === 'string' &&
    'last_name' in row && typeof row.last_name === 'string' &&
    'name_set_at' in row && (row.name_set_at === null || typeof row.name_set_at === 'string') &&
    'role' in row && (row.role === 'manager' || row.role === 'executor')
}


export async function updateUserName(supabase: SupabaseClient, userId: string, first: string, last: string): Promise<ProfileResult> {
  const firstName = first.trim()
  const lastName = last.trim()
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100 || `${firstName} ${lastName}`.length > 200) {
    return { profile: null, error: 'Введите имя и фамилию: до 100 символов каждое, до 200 вместе с пробелом.' }
  }
  try {
    const { data, error } = await supabase.rpc('set_profile_name', {
      p_user_id: userId, p_first_name: firstName, p_last_name: lastName,
    }).single()
    if (error?.code === '42501') return { profile: null, error: 'Можно изменять только свой профиль. Обновите страницу и попробуйте ещё раз.' }
    if (error) return { profile: null, error: 'Не удалось сохранить имя и фамилию. Попробуйте ещё раз.' }
    const row: unknown = data
    if (!isProfile(row) || row.id !== userId || row.name_set_at === null || !row.first_name.trim() || !row.last_name.trim()) {
      return { profile: null, error: 'Профиль не найден или содержит некорректные данные. Обновите страницу.' }
    }
    return { profile: row, error: null }
  } catch {
    return { profile: null, error: 'Не удалось сохранить имя и фамилию. Проверьте соединение и попробуйте ещё раз.' }
  }
}

export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, first_name, last_name, name_set_at, role').eq('id', userId).maybeSingle()
    if (error) {
      return { profile: null, error: 'Не удалось загрузить профиль. Попробуйте позже.' }
    }
    const row: unknown = data
    if (!row) {
      return { profile: null, error: 'Профиль CRM не найден. Обратитесь к администратору.' }
    }
    if (
      !isProfile(row) || row.id !== userId
    ) {
      return { profile: null, error: 'Профиль CRM содержит недопустимые данные или роль. Обратитесь к администратору.' }
    }
    return { profile: row, error: null }
  } catch {
    return { profile: null, error: 'Не удалось загрузить профиль. Попробуйте позже.' }
  }
}
