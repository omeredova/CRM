import { supabase } from '@/shared/api/supabase'

export type ConstructionObject = {
  id: string
  name: string
  address: string
}

type ObjectsResult =
  | { status: 'success'; objects: ConstructionObject[]; count: number }
  | { status: 'error'; error: string }

function isConstructionObject(value: unknown): value is ConstructionObject {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'address' in value && typeof value.address === 'string'
}

export const OBJECTS_PAGE_SIZE = 10

type ObjectResult =
  | { status: 'success'; object: ConstructionObject }
  | { status: 'not-found' }
  | { status: 'error'; error: string }

export async function getObject(id: string, signal: AbortSignal): Promise<ObjectResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { status: 'not-found' }
  }
  try {
    const { data, error } = await supabase.from('objects')
      .select('id, name, address').eq('id', id).abortSignal(signal).maybeSingle()
    if (error) return { status: 'error', error: 'Не удалось загрузить объект. Попробуйте ещё раз.' }
    if (!data) return { status: 'not-found' }
    if (!isConstructionObject(data)) return { status: 'error', error: 'Получены некорректные данные объекта.' }
    return { status: 'success', object: data }
  } catch {
    return { status: 'error', error: 'Не удалось загрузить объект. Проверьте соединение и попробуйте ещё раз.' }
  }
}

export async function getObjects(page: number, signal: AbortSignal): Promise<ObjectsResult> {
  try {
    // RLS determines which objects the authenticated user may read.
    const { data, error, count } = await supabase.from('objects')
      .select('id, name, address', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range((page - 1) * OBJECTS_PAGE_SIZE, page * OBJECTS_PAGE_SIZE - 1)
      .abortSignal(signal)

    if (error) {
      return { status: 'error', error: 'Не удалось загрузить объекты. Попробуйте ещё раз.' }
    }

    const rows: unknown = data
    if (!Array.isArray(rows) || !rows.every(isConstructionObject) || count === null) {
      return { status: 'error', error: 'Получены некорректные данные объектов. Попробуйте позже.' }
    }

    return { status: 'success', objects: rows, count }
  } catch {
    return { status: 'error', error: 'Не удалось загрузить объекты. Проверьте соединение и попробуйте ещё раз.' }
  }
}

export async function updateObject(id: string, name: string, address: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('objects')
      .update({ name: name.trim(), address: address.trim() }).eq('id', id).select('id').maybeSingle()
    if (error) return 'Не удалось сохранить объект. Проверьте данные и права доступа.'
    if (!data) return 'Объект удалён или больше недоступен.'
    return null
  } catch {
    return 'Не удалось сохранить объект. Проверьте соединение и попробуйте ещё раз.'
  }
}

export async function createObject(name: string, address: string): Promise<string | null> {
  try {
    const { error } = await supabase.from('objects').insert({ name: name.trim(), address: address.trim() })
    return error ? 'Не удалось создать объект. Проверьте данные и права доступа.' : null
  } catch {
    return 'Не удалось создать объект. Проверьте соединение и попробуйте ещё раз.'
  }
}

export async function deleteObject(id: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('objects').delete().eq('id', id).select('id').maybeSingle()
    if (error?.code === '23503') return 'Нельзя удалить объект, пока с ним связаны задачи. Сначала удалите или перенесите задачи.'
    if (error) return 'Не удалось удалить объект. Проверьте права доступа и попробуйте ещё раз.'
    if (!data) return 'Объект удалён или больше недоступен. Обновите список.'
    return null
  } catch {
    return 'Не удалось удалить объект. Проверьте соединение и попробуйте ещё раз.'
  }
}
