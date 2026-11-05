import { useState } from 'react'
import { Link } from 'react-router'

import type { CrmRole } from '@/features/auth/profile'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { OBJECTS_PAGE_SIZE } from './api'
import { CreateObject } from './create-object'
import { ObjectActions } from './object-actions'
import { useObjects } from './use-objects'

export function ObjectsList({ role }: { role: CrmRole }) {
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const { state, retry } = useObjects(page, setPage)
  const pageCount = state.status === 'success' ? Math.max(1, Math.ceil(state.count / OBJECTS_PAGE_SIZE)) : null

  function handleChanged(nextMessage: string) {
    setMessage(nextMessage)
    retry()
  }

  return (
    <section className="grid min-w-0 gap-6" aria-labelledby="objects-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <h1 id="objects-title" className="text-xl font-semibold">Объекты</h1>
          <p className="text-sm text-muted-foreground">
            {role === 'manager' ? 'Все строительные объекты.' : 'Объекты, на которых у вас есть задачи.'}
          </p>
        </div>
        {role === 'manager' && <CreateObject onCreated={() => {
          setMessage('Объект создан.')
          setPage(1)
          retry()
        }} />}
      </header>
      <p role="status" className={message ? 'text-sm text-muted-foreground' : 'sr-only'}>{message}</p>
      <div aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Загружаем объекты…</p>}
        {state.status === 'error' && <div className="grid justify-items-start gap-4">
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
          <Button type="button" variant="outline" onClick={retry}>Повторить</Button>
        </div>}
        {state.status === 'success' && (state.objects.length === 0 ? (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            {role === 'manager' ? 'Объектов пока нет. Создайте первый объект.' : 'Пока нет объектов с назначенными вам задачами.'}
          </p>
        ) : (
          <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.objects.map((object) => (
              <li key={object.id} className="min-w-0">
                <Card className="h-full gap-4">
                  <CardHeader className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 break-words pt-1 text-base font-semibold">
                      <Link to={`/objects/${object.id}`} className="rounded-md underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{object.name}</Link>
                    </h2>
                    <ObjectActions object={object} role={role} onChanged={handleChanged} />
                  </CardHeader>
                  <CardContent><p className="truncate text-sm text-muted-foreground" title={object.address}>{object.address}</p></CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <nav aria-label="Страницы объектов" className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          {state.status === 'success' ? `Страница ${page} из ${pageCount} · Всего объектов: ${state.count}` : `Страница ${page}`}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={state.status !== 'success' || page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
          <Button type="button" variant="outline" disabled={state.status !== 'success' || pageCount === null || page >= pageCount} onClick={() => setPage(page + 1)}>Далее</Button>
        </div>
      </nav>
    </section>
  )
}
