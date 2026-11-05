import type { SupabaseClient } from '@supabase/supabase-js'

export type CrmRole = 'manager' | 'executor'
export type Profile = { id: string; full_name: string; role: CrmRole }
type ProfileResult =
  | { profile: Profile; error: null }
  | { profile: null; error: string }

export async function getUserProfile(supabase: SupabaseClient, userId: string): Promise<ProfileResult> {
  try {
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, role').eq('id', userId).maybeSingle()
    if (error) {
      return { profile: null, error: 'Не удалось загрузить профиль. Попробуйте позже.' }
    }
    const row: unknown = data
    if (!row) {
      return { profile: null, error: 'Профиль CRM не найден. Обратитесь к администратору.' }
    }
    if (
      typeof row !== 'object' || !('id' in row) || row.id !== userId ||
      !('full_name' in row) || typeof row.full_name !== 'string' ||
      !('role' in row) || (row.role !== 'manager' && row.role !== 'executor')
    ) {
      return { profile: null, error: 'Профиль CRM содержит недопустимые данные или роль. Обратитесь к администратору.' }
    }
    return { profile: { id: userId, full_name: row.full_name, role: row.role }, error: null }
  } catch {
    return { profile: null, error: 'Не удалось загрузить профиль. Попробуйте позже.' }
  }
}
