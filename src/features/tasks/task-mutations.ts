import type { SupabaseClient } from '@supabase/supabase-js'

import type { CreateTaskInput } from './api'

export function validateTaskInput(input: CreateTaskInput): string | null {
  if (!input.title.trim() || input.title.trim().length > 300) return 'Укажите название задачи до 300 символов.'
  if (input.description.trim().length > 20000) return 'Описание не должно превышать 20 000 символов.'
  if (!input.assigneeId) return 'Выберите исполнителя.'
  if (!input.objectId) return 'Выберите объект.'
  return null
}

export async function updateTask(client: SupabaseClient, id: string, input: CreateTaskInput): Promise<string | null> {
  const failure = validateTaskInput(input)
  if (failure) return failure
  try {
    const { data, error } = await client.from('tasks').update({
      title: input.title.trim(), description: input.description.trim(),
      object_id: input.objectId, assignee_id: input.assigneeId,
    }).eq('id', id).select('id').maybeSingle()
    if (error?.code === '23503') return 'Объект или исполнитель больше недоступен. Обновите страницу.'
    if (error) return 'Не удалось сохранить задачу. Проверьте данные и права доступа.'
    return data ? null : 'Задача удалена или больше недоступна. Обновите страницу.'
  } catch {
    return 'Не удалось сохранить задачу. Проверьте соединение и попробуйте ещё раз.'
  }
}

export async function deleteTask(client: SupabaseClient, id: string): Promise<string | null> {
  try {
    const { data, error } = await client.from('tasks').delete().eq('id', id).select('id').maybeSingle()
    if (error) return 'Не удалось удалить задачу. Проверьте права доступа и попробуйте ещё раз.'
    return data ? null : 'Задача удалена или больше недоступна. Обновите страницу.'
  } catch {
    return 'Не удалось удалить задачу. Проверьте соединение и попробуйте ещё раз.'
  }
}
