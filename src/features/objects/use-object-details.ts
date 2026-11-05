import { useEffect, useState } from 'react'

import { getObjectTasks, TASKS_PAGE_SIZE, type ObjectTask } from '@/features/tasks/api'
import { getObject, type ConstructionObject } from './api'

type DetailsState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; error: string }
  | { status: 'success'; object: ConstructionObject; tasks: ObjectTask[]; count: number }

export function useObjectDetails(id: string, page: number, onPageChange: (page: number) => void) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; page: number; attempt: number; state: DetailsState } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      const objectResult = await getObject(id, controller.signal)
      if (controller.signal.aborted) return
      if (objectResult.status !== 'success') {
        setResult({ id, page, attempt, state: objectResult })
        return
      }
      const tasksResult = await getObjectTasks(id, page, controller.signal)
      if (controller.signal.aborted) return
      if (tasksResult.status === 'error') {
        setResult({ id, page, attempt, state: tasksResult })
        return
      }
      const lastPage = Math.max(1, Math.ceil(tasksResult.count / TASKS_PAGE_SIZE))
      if (page > lastPage) {
        onPageChange(lastPage)
        return
      }
      setResult({ id, page, attempt, state: { ...tasksResult, object: objectResult.object } })
    }

    void load()
    return () => controller.abort()
  }, [id, page, attempt, onPageChange])

  const state: DetailsState = result?.id === id && result.page === page && result.attempt === attempt
    ? result.state : { status: 'loading' }

  return { state, retry: () => setAttempt((value) => value + 1) }
}
