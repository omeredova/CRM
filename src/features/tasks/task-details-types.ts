import type { TaskStatus } from './api'

export type TaskDetails = {
  id: string
  title: string
  description: string
  object_id: string
  assignee_id: string
  author_id: string
  status: TaskStatus
  created_at: string
}

export type HistoryEntry = {
  id: string
  actor_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  comment: string | null
  created_at: string
}

export type TaskDetailsState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; error: string }
  | {
      status: 'success'
      task: TaskDetails
      object: TaskObject
      history: HistoryEntry[]
      names: Record<string, string>
    }

export type TaskObject = {
  id: string
  name: string
  address: string
}
