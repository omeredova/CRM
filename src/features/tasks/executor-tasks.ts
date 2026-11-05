import type { SupabaseClient } from '@supabase/supabase-js'

import { TASKS_PAGE_SIZE, taskStatusLabels, type TaskStatus } from './api'
import { isTaskId } from './task-details-validation'

export type ExecutorTask = {
  id: string
  title: string
  status: TaskStatus
  assignee_id: string
  object: { id: string; name: string }
}

export type ExecutorTasksResult =
  | { status: 'success'; tasks: ExecutorTask[]; count: number }
  | { status: 'error'; error: string }

function isExecutorTask(value: unknown): value is ExecutorTask {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && isTaskId(value.id)
    && 'title' in value && typeof value.title === 'string'
    && 'status' in value && typeof value.status === 'string' && Object.hasOwn(taskStatusLabels, value.status)
    && 'assignee_id' in value && isTaskId(value.assignee_id)
    && 'object' in value && typeof value.object === 'object' && value.object !== null
    && 'id' in value.object && isTaskId(value.object.id)
    && 'name' in value.object && typeof value.object.name === 'string'
}

export async function getExecutorTasks(client: SupabaseClient, userId: string, page: number, signal: AbortSignal): Promise<ExecutorTasksResult> {
  if (!isTaskId(userId) || !Number.isSafeInteger(page) || page < 1) {
    return { status: 'error', error: 'Не удалось загрузить задачи. Обновите страницу.' }
  }
  try {
    const { data, error, count } = await client.from('tasks')
      .select('id, title, status, assignee_id, object:objects!tasks_object_id_fkey(id, name)', { count: 'exact' })
      .eq('assignee_id', userId)
      .order('created_at', { ascending: false }).order('id', { ascending: true })
      .range((page - 1) * TASKS_PAGE_SIZE, page * TASKS_PAGE_SIZE - 1).abortSignal(signal)
    if (error) return { status: 'error', error: 'Не удалось загрузить задачи. Попробуйте ещё раз.' }
    const rows: unknown = data
    if (!Array.isArray(rows) || !rows.every(isExecutorTask) || rows.some((task) => task.assignee_id !== userId)
      || count === null || !Number.isSafeInteger(count) || count < 0) {
      return { status: 'error', error: 'Получены некорректные данные задач. Обновите страницу.' }
    }
    return { status: 'success', tasks: rows, count }
  } catch {
    return { status: 'error', error: 'Не удалось загрузить задачи. Проверьте соединение и попробуйте ещё раз.' }
  }
}
