import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { updateUserName } from './profile'

const saved = { id: 'user-id', first_name: 'Иван', last_name: 'Иванов', full_name: 'Иван Иванов', name_set_at: '2026-11-05T12:00:00Z', role: 'executor' }

function createClient() {
  const single = vi.fn()
  const rpc = vi.fn(() => ({ single }))
  return { client: { rpc } as unknown as SupabaseClient, rpc, single }
}

describe('save first and last name', () => {
  it('uses the protected function with trimmed names', async () => {
    const { client, rpc, single } = createClient()
    single.mockResolvedValue({ data: saved, error: null })
    expect(await updateUserName(client, 'user-id', ' Иван ', ' Иванов ')).toEqual({ profile: saved, error: null })
    expect(rpc).toHaveBeenCalledWith('set_profile_name', { p_user_id: 'user-id', p_first_name: 'Иван', p_last_name: 'Иванов' })
  })

  it.each([[' ', 'Иванов'], ['Иван', ' '], ['И'.repeat(101), 'Иванов'], ['И'.repeat(100), 'И'.repeat(100)]])('rejects invalid names before sending: %s %s', async (first, last) => {
    const { client, rpc } = createClient()
    expect((await updateUserName(client, 'user-id', first, last)).error).toBeTruthy()
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    { data: null, error: { code: '42501', message: 'private details' } },
    { data: { ...saved, id: 'other-user' }, error: null },
    { data: { ...saved, name_set_at: null }, error: null },
  ])('does not report success for rejected or mismatched updates: %j', async (result) => {
    const { client, single } = createClient()
    single.mockResolvedValue(result)
    const response = await updateUserName(client, 'user-id', 'Иван', 'Иванов')
    expect(response.profile).toBeNull()
    expect(response.error).toBeTruthy()
    expect(response.error).not.toContain('private details')
  })

  it('handles network failure', async () => {
    const { client, single } = createClient()
    single.mockRejectedValue(new Error('network'))
    expect((await updateUserName(client, 'user-id', 'Иван', 'Иванов')).error).toBeTruthy()
  })
})
