import { useEffect, useState } from 'react'

import { supabase } from '@/shared/api/supabase'
import { TASKS_PAGE_SIZE } from './api'
import { getExecutorTasks, type ExecutorTasksResult } from './executor-tasks'

type State = { status: 'loading' } | ExecutorTasksResult

export function useExecutorTasks(userId: string, page: number, onPageChange: (page: number) => void) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ userId: string; page: number; attempt: number; state: State } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getExecutorTasks(supabase, userId, page, controller.signal).then((state) => {
      if (controller.signal.aborted) return
      if (state.status === 'success') {
        const lastPage = Math.max(1, Math.ceil(state.count / TASKS_PAGE_SIZE))
        if (page > lastPage) {
          onPageChange(lastPage)
          return
        }
      }
      setResult({ userId, page, attempt, state })
    })
    return () => controller.abort()
  }, [userId, page, attempt, onPageChange])

  const state: State = result?.userId === userId && result.page === page && result.attempt === attempt
    ? result.state : { status: 'loading' }

  return { state, retry: () => setAttempt((value) => value + 1) }
}
