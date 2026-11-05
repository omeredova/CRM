import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({ taskStatusLabels: {
  new: 'Новая', in_progress: 'В работе', in_review: 'На проверке', accepted: 'Принята', revision: 'На доработке',
} }))

import { getTaskDetails } from './task-details'

const id = '11111111-1111-4111-8111-111111111111'
const objectId = '22222222-2222-4222-8222-222222222222'
const actorId = '33333333-3333-4333-8333-333333333333'
const task = { id, object_id: objectId, author_id: actorId, assignee_id: actorId, title: 'Задача', description: '', status: 'new', created_at: '2026-11-05T10:00:00Z' }
const entry = { id, actor_id: actorId, from_status: null, to_status: 'new', comment: null, created_at: task.created_at }

function mockClient(responses: unknown[]) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(responses.shift()).then(resolve),
  }
  const from = vi.fn(() => query)
  return { client: { from } as unknown as SupabaseClient, from, query }
}

describe('task details loading', () => {
  it('does not query malformed task identifiers', async () => {
    const { client, from } = mockClient([])
    expect(await getTaskDetails(client, 'invalid', new AbortController().signal)).toEqual({ status: 'not-found' })
    expect(from).not.toHaveBeenCalled()
  })

  it('does not load related data when the task is hidden or missing', async () => {
    const { client, from } = mockClient([{ data: null, error: null }])
    expect(await getTaskDetails(client, id, new AbortController().signal)).toEqual({ status: 'not-found' })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('loads history beyond the first API page', async () => {
    const { client, query } = mockClient([
      { data: task }, { data: { id: objectId, name: 'Объект', address: 'Адрес' } },
      { data: Array.from({ length: 200 }, () => entry), count: 201 },
      { data: [{ ...entry, from_status: 'new', to_status: 'in_progress' }], count: 201 },
      { data: [{ id: actorId, full_name: 'Анна Иванова' }] },
    ])
    const result = await getTaskDetails(client, id, new AbortController().signal)
    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('Expected loaded task')
    expect(result.history).toHaveLength(201)
    expect(result.names[actorId]).toBe('Анна Иванова')
    expect(query.range.mock.calls).toEqual([[0, 199], [200, 399]])
  })

  it('reports a failed history request instead of showing an empty history', async () => {
    const { client } = mockClient([
      { data: task }, { data: { id: objectId, name: 'Объект', address: 'Адрес' } },
      { data: null, error: { message: 'private details' } },
    ])
    const result = await getTaskDetails(client, id, new AbortController().signal)
    expect(result.status).toBe('error')
    expect(JSON.stringify(result)).not.toContain('private details')
  })
})
