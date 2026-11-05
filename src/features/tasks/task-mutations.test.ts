import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { deleteTask, updateTask } from './task-mutations'

const input = { title: ' Задача ', description: ' Описание ', objectId: 'object', assigneeId: 'executor' }

function mockClient(data: unknown = { id: 'task' }, error: unknown = null) {
  const query = {
    update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
  const from = vi.fn(() => query)
  return { client: { from } as unknown as SupabaseClient, from, query }
}

describe('task editing and deletion', () => {
  it('updates only editable fields even if input contains protected fields', async () => {
    const { client, query } = mockClient()
    const extra = { ...input, status: 'accepted', author_id: 'other', created_at: 'forged' }
    expect(await updateTask(client, 'task', extra)).toBeNull()
    expect(query.update).toHaveBeenCalledWith({ title: 'Задача', description: 'Описание', object_id: 'object', assignee_id: 'executor' })
    expect(query.eq).toHaveBeenCalledWith('id', 'task')
  })

  it.each([
    { ...input, title: ' \n ' }, { ...input, title: 'x'.repeat(301) },
    { ...input, description: 'x'.repeat(20001) }, { ...input, objectId: '' }, { ...input, assigneeId: '' },
  ])('rejects invalid input before submitting', async (invalid) => {
    const { client, from } = mockClient()
    expect(await updateTask(client, 'task', invalid)).toBeTruthy()
    expect(from).not.toHaveBeenCalled()
  })

  it('does not report an update or deletion of zero rows as successful', async () => {
    const { client } = mockClient(null)
    expect(await updateTask(client, 'task', input)).toContain('недоступна')
    expect(await deleteTask(client, 'task')).toContain('недоступна')
  })

  it('deletes only the selected task without deleting history through the client', async () => {
    const { client, from, query } = mockClient()
    expect(await deleteTask(client, 'task')).toBeNull()
    expect(from).toHaveBeenCalledExactlyOnceWith('tasks')
    expect(query.eq).toHaveBeenCalledWith('id', 'task')
    expect(query.delete).toHaveBeenCalledOnce()
  })

  it('reports rejected requests without exposing database details', async () => {
    const { client } = mockClient(null, { code: '42501', message: 'private details' })
    for (const result of [await updateTask(client, 'task', input), await deleteTask(client, 'task')]) {
      expect(result).toBeTruthy()
      expect(result).not.toContain('private details')
    }
  })

  it('handles connection failures for both operations', async () => {
    const { client, query } = mockClient()
    query.maybeSingle.mockRejectedValue(new Error('network'))
    expect(await updateTask(client, 'task', input)).toContain('соединение')
    expect(await deleteTask(client, 'task')).toContain('соединение')
  })
})
