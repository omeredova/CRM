import { useEffect, useState } from 'react'

import { getObject, type ConstructionObject } from './api'

type DetailsState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; error: string }
  | { status: 'success'; object: ConstructionObject }

export function useObjectDetails(id: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ id: string; attempt: number; state: DetailsState } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void getObject(id, controller.signal).then((state) => {
      if (!controller.signal.aborted) setResult({ id, attempt, state })
    })
    return () => controller.abort()
  }, [id, attempt])

  const state: DetailsState = result?.id === id && result.attempt === attempt
    ? result.state : { status: 'loading' }

  return { state, retry: () => setAttempt((value) => value + 1) }
}
