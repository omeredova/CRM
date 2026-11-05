import type { SupabaseClient } from '@supabase/supabase-js'

import type { CrmRole } from '@/features/auth/profile'
import type { TaskStatus } from './api'
import type { TaskDetails } from './task-details-types'

export type TaskActionStatus = Exclude<TaskStatus, 'new'>

export function availableTaskStatuses(task: TaskDetails, user: { id: string; role: CrmRole }): TaskActionStatus[] {
  if (user.role === 'manager') return task.status === 'in_review' ? ['accepted', 'revision'] : []
  if (task.assignee_id !== user.id) return []
  if (task.status === 'new' || task.status === 'revision') return ['in_progress']
  return task.status === 'in_progress' ? ['in_review'] : []
}

export async function changeTaskStatus(client: SupabaseClient, taskId: string, status: TaskActionStatus, comment = ''): Promise<string | null> {
  const text = comment.trim()
  if (status === 'revision' && !text) return 'Укажите причину возврата на доработку.'
  if (text.length > 5000) return 'Комментарий не должен превышать 5000 символов.'
  try {
    const { error } = await client.rpc('change_task_status', {
      p_task_id: taskId, p_to_status: status, p_comment: text || null,
    })
    if (error?.code === '42501') return 'Задача недоступна или у вас нет прав на это действие. Обновите страницу.'
    if (error?.code === '23514') return 'Статус задачи изменился или переход запрещён. Обновите страницу и проверьте статус.'
    if (error?.code === 'PGRST202') return 'Смена статуса пока недоступна. Обратитесь к администратору.'
    return error ? 'Не удалось изменить статус. Попробуйте ещё раз.' : null
  } catch {
    return 'Не удалось изменить статус. Проверьте соединение. Перед повторной отправкой обновите страницу и проверьте статус задачи.'
  }
}
