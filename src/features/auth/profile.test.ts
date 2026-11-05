import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getUserProfile } from './profile'

const single = vi.fn()
const eq = vi.fn(() => ({ maybeSingle: single }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))
const client = { from } as unknown as SupabaseClient
const validProfile = { id: 'user-id', full_name: '', first_name: '', last_name: '', name_set_at: null, role: 'executor' }

beforeEach(() => vi.clearAllMocks())

describe('CRM profile validation', () => {
  it.each(['manager', 'executor'])('loads the authenticated user with role %s', async (role) => {
    const profile = { id: 'user-id', full_name: '', first_name: '', last_name: '', name_set_at: null, role }
    single.mockResolvedValueOnce({ data: profile, error: null })
    expect(await getUserProfile(client, 'user-id')).toEqual({ profile, error: null })
    expect(from).toHaveBeenCalledWith('profiles')
    expect(select).toHaveBeenCalledWith('id, full_name, first_name, last_name, name_set_at, role')
    expect(eq).toHaveBeenCalledWith('id', 'user-id')
  })

  it.each([
    null,
    { ...validProfile, role: 'admin' },
    { ...validProfile, role: null },
    { ...validProfile, id: 'other-user', role: 'manager' },
    { ...validProfile, full_name: null },
    { ...validProfile, first_name: null },
    { ...validProfile, name_set_at: 123 },
  ])('denies missing or invalid profiles: %j', async (data) => {
    single.mockResolvedValueOnce({ data, error: null })
    const result = await getUserProfile(client, 'user-id')
    expect(result.profile).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('does not expose database errors or admit a user when the query fails', async () => {
    single.mockResolvedValueOnce({ data: null, error: { message: 'private database details' } })
    expect(await getUserProfile(client, 'user-id')).toEqual({
      profile: null, error: 'Не удалось загрузить профиль. Попробуйте позже.',
    })
  })

  it('denies access on a network failure', async () => {
    single.mockRejectedValueOnce(new Error('network failure'))
    expect((await getUserProfile(client, 'user-id')).profile).toBeNull()
  })
})
