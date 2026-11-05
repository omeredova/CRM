import type { SupabaseClient } from '@supabase/supabase-js'

import type { HistoryEntry } from './task-details-types'
import { isTask, isHistory, isTaskObject, isTaskParticipant } from './task-details-validation'

export async function loadTask(client: SupabaseClient, id: string, signal: AbortSignal) {
  const taskResult = await client.from('tasks')
    .select('id, title, description, object_id, assignee_id, author_id, status, created_at')
    .eq('id', id).abortSignal(signal).maybeSingle()
  if (taskResult.error) throw new Error('task')
  if (!taskResult.data) return null
  const task: unknown = taskResult.data
  if (!isTask(task) || task.id !== id) throw new Error('task data')

  return task
}

export async function loadTaskObject(client: SupabaseClient, objectId: string, signal: AbortSignal) {
  const objectResult = await client.from('objects').select('id, name, address')
    .eq('id', objectId).abortSignal(signal).maybeSingle()
  const object: unknown = objectResult.data
  if (objectResult.error || !isTaskObject(object) || object.id !== objectId) throw new Error('object')

  return { id: objectId, name: object.name, address: object.address }
}

export async function loadTaskHistory(client: SupabaseClient, id: string, signal: AbortSignal) {
  const history: HistoryEntry[] = []
  const batchSize = 200
  for (let offset = 0; ; offset += batchSize) {
    const result = await client.from('task_history')
      .select('id, actor_id, from_status, to_status, comment, created_at', { count: 'exact' })
      .eq('task_id', id).order('event_order', { ascending: false })
      .range(offset, offset + batchSize - 1).abortSignal(signal)
    const entries: unknown = result.data
    if (result.error || !Array.isArray(entries) || !entries.every(isHistory) || result.count === null) {
      throw new Error('history')
    }
    history.push(...entries)
    if (history.length >= result.count) break
    if (entries.length === 0) throw new Error('incomplete history')
  }

  return history
}

export async function loadTaskParticipantNames(client: SupabaseClient, ids: string[], signal: AbortSignal) {
  const batchSize = 200
  const names: Record<string, string> = {}
  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const result = await client.from('profiles').select('id, full_name').in('id', ids.slice(offset, offset + batchSize)).abortSignal(signal)
    const profiles: unknown = result.data
    if (result.error || !Array.isArray(profiles)) throw new Error('profiles')
    for (const profile of profiles) {
      if (!isTaskParticipant(profile)) throw new Error('profile data')
      names[profile.id] = profile.full_name.trim()
    }
  }
  return names
}
