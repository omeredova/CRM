import { useEffect, useState } from 'react'

import { getObjects, OBJECTS_PAGE_SIZE, type ConstructionObject } from './api'

type ObjectsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; objects: ConstructionObject[]; count: number }

export function useObjects(page: number, onPageChange: (page: number) => void) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ page: number; attempt: number; state: ObjectsState } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void getObjects(page, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.status === 'error') {
        setResult({ page, attempt, state: { status: 'error', error: result.error } })
      } else {
        const lastPage = Math.max(1, Math.ceil(result.count / OBJECTS_PAGE_SIZE))
        if (page > lastPage) {
          onPageChange(lastPage)
          return
        }
        setResult({ page, attempt, state: { status: 'success', objects: result.objects, count: result.count } })
      }
    })

    return () => controller.abort()
  }, [page, attempt, onPageChange])

  function retry() {
    setAttempt((value) => value + 1)
  }

  const state: ObjectsState = result?.page === page && result.attempt === attempt ? result.state : { status: 'loading' }

  return { state, retry }
}
