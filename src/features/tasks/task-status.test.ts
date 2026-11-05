import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { TaskStatus } from './api'
import type { TaskDetails } from './task-details-types'
import { availableTaskStatuses, changeTaskStatus } from './task-status'

const task: TaskDetails = {
  id: 'task', title: 'Задача', description: '', object_id: 'object',
  assignee_id: 'executor', author_id: 'manager', status: 'new', created_at: '2026-11-05T10:00:00Z',
}
const statuses: TaskStatus[] = ['new', 'in_progress', 'in_review', 'accepted', 'revision']

describe('available task actions', () => {
  it('offers only the allowed actions to the assigned executor', () => {
    expect(statuses.map((status) => availableTaskStatuses({ ...task, status }, { id: 'executor', role: 'executor' })))
      .toEqual([['in_progress'], ['in_review'], [], [], ['in_progress']])
  })

  it('does not offer actions to another executor', () => {
    for (const status of statuses) {
      expect(availableTaskStatuses({ ...task, status }, { id: 'other', role: 'executor' })).toEqual([])
    }
  })

  it('allows managers to accept or return only tasks in review, regardless of author', () => {
    expect(statuses.map((status) => availableTaskStatuses({ ...task, status }, { id: 'other-manager', role: 'manager' })))
      .toEqual([[], [], ['accepted', 'revision'], [], []])
  })
})

function mockClient(error: { code: string; message?: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ error })
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

describe('change task status', () => {
  it('rejects blank revision comments and excessive length before calling the API', async () => {
    const { client, rpc } = mockClient()
    expect(await changeTaskStatus(client, task.id, 'revision', ' \n ')).toBeTruthy()
    expect(await changeTaskStatus(client, task.id, 'revision', 'a'.repeat(5001))).toBeTruthy()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('passes a trimmed comment to the protected RPC', async () => {
    const { client, rpc } = mockClient()
    expect(await changeTaskStatus(client, task.id, 'revision', ' Исправить отделку ')).toBeNull()
    expect(rpc).toHaveBeenCalledWith('change_task_status', {
      p_task_id: task.id, p_to_status: 'revision', p_comment: 'Исправить отделку',
    })
  })

  it('sends no comment for a normal transition', async () => {
    const { client, rpc } = mockClient()
    expect(await changeTaskStatus(client, task.id, 'in_progress')).toBeNull()
    expect(rpc).toHaveBeenCalledWith('change_task_status', {
      p_task_id: task.id, p_to_status: 'in_progress', p_comment: null,
    })
  })

  it.each(['42501', '23514', 'PGRST202', 'unknown'])('reports a %s rejection without exposing database details', async (code) => {
    const { client } = mockClient({ code, message: 'private database details' })
    const result = await changeTaskStatus(client, task.id, 'accepted')
    expect(result).toBeTruthy()
    expect(result).not.toContain('private database details')
  })

  it('handles a network failure', async () => {
    const { client, rpc } = mockClient()
    rpc.mockRejectedValueOnce(new Error('network'))
    expect(await changeTaskStatus(client, task.id, 'in_review')).toContain('проверьте статус')
  })
})
