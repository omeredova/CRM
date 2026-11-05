import { supabase } from '@/shared/api/supabase'

export const taskStatusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  accepted: 'Принята',
  revision: 'На доработке',
} as const

export type TaskStatus = keyof typeof taskStatusLabels
export type ObjectTask = { id: string; title: string; status: TaskStatus }

export const TASKS_PAGE_SIZE = 10

export type Executor = { id: string; full_name: string; email: string }

type ExecutorsResult =
  | { status: 'success'; executors: Executor[] }
  | { status: 'error'; error: string }

function isExecutor(value: unknown): value is Executor {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'full_name' in value && typeof value.full_name === 'string' &&
    'email' in value && typeof value.email === 'string'
}

export async function getExecutors(signal: AbortSignal): Promise<ExecutorsResult> {
  try {
    const executors: Executor[] = []
    const batchSize = 200
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await supabase.rpc('list_task_executors')
        .order('full_name').order('id').range(offset, offset + batchSize - 1).abortSignal(signal)
      if (error?.code === 'PGRST202') return { status: 'error', error: 'Список исполнителей пока недоступен. Обратитесь к администратору.' }
      if (error) return { status: 'error', error: 'Не удалось загрузить исполнителей. Попробуйте ещё раз.' }
      const rows: unknown = data
      if (!Array.isArray(rows) || !rows.every(isExecutor)) {
        return { status: 'error', error: 'Получены некорректные данные исполнителей.' }
      }
      executors.push(...rows)
      if (rows.length < batchSize) return { status: 'success', executors }
    }
  } catch {
    return { status: 'error', error: 'Не удалось загрузить исполнителей. Проверьте соединение.' }
  }
}

export type CreateTaskInput = {
  title: string
  description: string
  objectId: string
  assigneeId: string
}

export async function createTask(input: CreateTaskInput): Promise<string | null> {
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title || title.length > 300) return 'Укажите название задачи до 300 символов.'
  if (description.length > 20000) return 'Описание не должно превышать 20 000 символов.'
  if (!input.assigneeId) return 'Выберите исполнителя.'
  try {
    const { error } = await supabase.from('tasks').insert({
      title, description, object_id: input.objectId, assignee_id: input.assigneeId,
    })
    if (error?.code === '23503') return 'Объект или исполнитель больше недоступен. Обновите страницу.'
    if (error?.code === '42501') return 'Создавать задачи может только постановщик. Проверьте права доступа.'
    return error ? 'Не удалось создать задачу. Проверьте данные и попробуйте ещё раз.' : null
  } catch {
    return 'Не удалось создать задачу. Проверьте соединение и попробуйте ещё раз.'
  }
}

function isObjectTask(value: unknown): value is ObjectTask {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'status' in value && typeof value.status === 'string' &&
    Object.hasOwn(taskStatusLabels, value.status)
}

type TasksResult =
  | { status: 'success'; tasks: ObjectTask[]; count: number }
  | { status: 'error'; error: string }

export async function getObjectTasks(objectId: string, page: number, signal: AbortSignal): Promise<TasksResult> {
  try {
    const { data, error, count } = await supabase.from('tasks')
      .select('id, title, status', { count: 'exact' }).eq('object_id', objectId)
      .order('created_at', { ascending: false }).order('id', { ascending: true })
      .range((page - 1) * TASKS_PAGE_SIZE, page * TASKS_PAGE_SIZE - 1).abortSignal(signal)
    if (error) return { status: 'error', error: 'Не удалось загрузить задачи. Попробуйте ещё раз.' }
    const rows: unknown = data
    if (!Array.isArray(rows) || !rows.every(isObjectTask) || count === null) {
      return { status: 'error', error: 'Получены некорректные данные задач.' }
    }
    return { status: 'success', tasks: rows, count }
  } catch {
    return { status: 'error', error: 'Не удалось загрузить задачи. Проверьте соединение и попробуйте ещё раз.' }
  }
}
