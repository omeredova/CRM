import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/shared/api/supabase'
import { getUserProfile, type Profile } from './profile'

type SessionState = {
  session: Session | null
  loading: boolean
  error: string | null
}

type ProfileState = {
  session: Session
  profile: Profile | null
  error: string | null
}

export function useAuthSession() {
  const [auth, setAuth] = useState<SessionState>({ session: null, loading: true, error: null })
  const [profileState, setProfileState] = useState<ProfileState | null>(null)
  const { session } = auth

  useEffect(() => {
    let active = true
    let eventReceived = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      eventReceived = true
      setAuth({ session: nextSession, loading: false, error: null })
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return
      setAuth({
        session: error ? null : data.session,
        loading: false,
        error: error ? 'Не удалось проверить сессию. Обновите страницу.' : null,
      })
    }).catch(() => {
      if (!active || eventReceived) return
      setAuth({ session: null, loading: false, error: 'Не удалось проверить сессию. Обновите страницу.' })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return
    let active = true

    void getUserProfile(supabase, session.user.id).then((result) => {
      if (!active) return
      setProfileState({ session, profile: result.profile, error: result.error })
    })

    return () => { active = false }
  }, [session])

  const currentProfile = profileState?.session === session ? profileState : null

  return {
    session,
    profile: currentProfile?.profile ?? null,
    loading: auth.loading || Boolean(session && !currentProfile),
    error: auth.error ?? currentProfile?.error ?? null,
  }
}
