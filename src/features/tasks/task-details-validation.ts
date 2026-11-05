import { taskStatusLabels, type TaskStatus } from './api'
import type { HistoryEntry, TaskDetails, TaskObject } from './task-details-types'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isTaskId = (value: unknown): value is string => typeof value === 'string' && uuid.test(value)
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isTaskStatus = (value: unknown): value is TaskStatus => typeof value === 'string' && Object.hasOwn(taskStatusLabels, value)
const isDateString = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function isTask(value: unknown): value is TaskDetails {
  return isRecord(value)
    && isTaskId(value.id)
    && isTaskId(value.object_id)
    && isTaskId(value.assignee_id)
    && isTaskId(value.author_id)

    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && isTaskStatus(value.status)
    && isDateString(value.created_at)
}

export function isHistory(value: unknown): value is HistoryEntry {
  return isRecord(value)
    && isTaskId(value.id)
    && isTaskId(value.actor_id)
    && (value.from_status === null || isTaskStatus(value.from_status))

    && isTaskStatus(value.to_status)
    && (value.comment === null || typeof value.comment === 'string')
    && isDateString(value.created_at)
}

export function isTaskObject(value: unknown): value is TaskObject {
  return isRecord(value)
    && isTaskId(value.id)

    && typeof value.name === 'string'
    && typeof value.address === 'string'
}

export function isTaskParticipant(value: unknown): value is { id: string; full_name: string } {
  return isRecord(value)
    && isTaskId(value.id)
    && typeof value.full_name === 'string'
}
