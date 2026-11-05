import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ TASKS_PAGE_SIZE: 10, taskStatusLabels: {
  new: 'Новая', in_progress: 'В работе', in_review: 'На проверке', accepted: 'Принята', revision: 'На доработке',
} }))

import { getExecutorTasks } from './executor-tasks'

const userId = '11111111-1111-4111-8111-111111111111'
const otherUserId = '22222222-2222-4222-8222-222222222222'
const task = {
  id: '33333333-3333-4333-8333-333333333333', title: 'Проверить отделку', status: 'accepted', assignee_id: userId,
  object: { id: '44444444-4444-4444-8444-444444444444', name: 'Дом' },
}

function mockClient(response: unknown) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve),
  }
  const from = vi.fn(() => query)
  return { client: { from } as unknown as SupabaseClient, query, from }
}

describe('executor task list', () => {
  it('requests only the current executor and the second page, including accepted tasks', async () => {
    const { client, query } = mockClient({ data: [task], count: 11, error: null })
    const signal = new AbortController().signal
    expect(await getExecutorTasks(client, userId, 2, signal)).toEqual({ status: 'success', tasks: [task], count: 11 })
    expect(query.eq).toHaveBeenCalledExactlyOnceWith('assignee_id', userId)
    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' })
    expect(query.range).toHaveBeenCalledWith(10, 19)
    expect(query.order.mock.calls).toEqual([['created_at', { ascending: false }], ['id', { ascending: true }]])
    expect(query.abortSignal).toHaveBeenCalledWith(signal)
  })

  it('accepts an empty list with a zero count', async () => {
    const { client } = mockClient({ data: [], count: 0, error: null })
    expect(await getExecutorTasks(client, userId, 1, new AbortController().signal))
      .toEqual({ status: 'success', tasks: [], count: 0 })
  })

  it.each([
    { data: [task], count: null },
    { data: [{ ...task, object: null }], count: 1 },
    { data: [{ ...task, status: 'unknown' }], count: 1 },
    { data: [{ ...task, assignee_id: otherUserId }], count: 1 },
  ])('rejects incomplete or unexpected data: %j', async (response) => {
    const { client } = mockClient(response)
    expect((await getExecutorTasks(client, userId, 1, new AbortController().signal)).status).toBe('error')
  })

  it('does not query without a valid user identifier or page', async () => {
    const { client, from } = mockClient({ data: [], count: 0 })
    for (const [id, page] of [['', 1], [userId, 0], [userId, 1.5]] as const) {
      expect((await getExecutorTasks(client, id, page, new AbortController().signal)).status).toBe('error')
    }
    expect(from).not.toHaveBeenCalled()
  })

  it('reports an API failure without exposing internal details', async () => {
    const { client } = mockClient({ data: null, count: null, error: { message: 'private details' } })
    const result = await getExecutorTasks(client, userId, 1, new AbortController().signal)
    expect(result.status).toBe('error')
    expect(JSON.stringify(result)).not.toContain('private details')
  })

  it('handles connection failures', async () => {
    const client = { from: () => { throw new Error('network') } } as unknown as SupabaseClient
    const result = await getExecutorTasks(client, userId, 1, new AbortController().signal)
    expect(result.status).toBe('error')
  })
})
