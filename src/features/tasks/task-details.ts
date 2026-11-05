import type { SupabaseClient } from '@supabase/supabase-js'

import { loadTask, loadTaskObject, loadTaskHistory, loadTaskParticipantNames } from './task-details-queries'
import type { TaskDetailsState } from './task-details-types'
import { isTaskId } from './task-details-validation'

export async function getTaskDetails(client: SupabaseClient, id: string, signal: AbortSignal): Promise<TaskDetailsState> {
  if (!isTaskId(id)) return { status: 'not-found' }

  try {
    const task = await loadTask(client, id, signal)
    if (!task) return { status: 'not-found' }

    const object = await loadTaskObject(client, task.object_id, signal)
    const history = await loadTaskHistory(client, id, signal)
    const participantIds = [...new Set([
      task.author_id,
      task.assignee_id,
      ...history.map((entry) => entry.actor_id),
    ])]
    const names = await loadTaskParticipantNames(client, participantIds, signal)

    return { status: 'success', task, object, history, names }
  } catch {
    return { status: 'error', error: 'Не удалось загрузить задачу и историю. Проверьте соединение и попробуйте ещё раз.' }
  }
}
