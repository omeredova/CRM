import { useEffect, useState } from 'react'

import { supabase } from '@/shared/api/supabase'
import { getTaskDetails } from './task-details'
import type { TaskDetailsState } from './task-details-types'

export function useTaskDetails(id: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; attempt: number; state: TaskDetailsState } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getTaskDetails(supabase, id, controller.signal).then((state) => {
      if (!controller.signal.aborted) setResult({ id, attempt, state })
    })
    return () => controller.abort()
  }, [id, attempt])
  const state: TaskDetailsState = result?.id === id && result.attempt === attempt ? result.state : { status: 'loading' }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
