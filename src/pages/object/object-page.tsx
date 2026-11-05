import { useState } from 'react'
import { Link, useParams } from 'react-router'

import type { CrmRole } from '@/features/auth/profile'
import { useObjectDetails } from '@/features/objects/use-object-details'
import { CreateTask } from '@/features/tasks/create-task'
import { TASKS_PAGE_SIZE, taskStatusLabels } from '@/features/tasks/api'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

function ObjectDetails({ id, role }: { id: string; role: CrmRole }) {
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const { state, retry } = useObjectDetails(id, page, setPage)

  return (
    <div className="grid min-w-0 gap-6">
      <Link to="/" className="w-fit rounded-md text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">← К объектам</Link>
      <p role="status" className={message ? 'text-sm text-muted-foreground' : 'sr-only'}>{message}</p>
      {state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Загружаем объект и задачи…</p>}
      {state.status === 'error' && <div className="grid justify-items-start gap-4">
        <h1 className="text-xl font-semibold">Не удалось открыть объект</h1>
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
        <Button type="button" variant="outline" onClick={retry}>Повторить</Button>
      </div>}
      {state.status === 'not-found' && <div className="grid gap-2">
        <h1 className="text-xl font-semibold">Объект не найден или недоступен</h1>
        <p className="text-sm text-muted-foreground">Объект мог быть удалён, либо у вас нет доступа к нему.</p>
      </div>}
      {state.status === 'success' && <>
        <header className="grid min-w-0 gap-2">
          <h1 className="break-words text-xl font-semibold">{state.object.name}</h1>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground"><span className="font-medium">Адрес: </span>{state.object.address}</p>
        </header>
        <section className="grid min-w-0 gap-4" aria-labelledby="object-tasks-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <h2 id="object-tasks-title" className="text-lg font-semibold">Задачи объекта</h2>
            </div>
            {role === 'manager' && <CreateTask objectId={id} onCreated={() => {
              setMessage('Задача создана.')
              setPage(1)
              retry()
            }} />}
          </div>
          {state.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{role === 'manager' ? 'У этого объекта пока нет задач. Создайте первую задачу.' : 'В этом объекте нет доступных вам задач.'}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table className="table-fixed">
                <caption className="sr-only">Задачи объекта и их текущие статусы</caption>
                <TableHeader><TableRow><TableHead>Название</TableHead><TableHead className="w-36 sm:w-44">Статус</TableHead></TableRow></TableHeader>
                <TableBody>{state.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="break-words font-medium"><Link to={`/tasks/${task.id}`} className="rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">{task.title}</Link></TableCell>
                    <TableCell><span className="inline-flex rounded-md border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{taskStatusLabels[task.status]}</span></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
          {state.count > 0 && <nav aria-label="Страницы задач объекта" className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">Страница {page} из {Math.max(1, Math.ceil(state.count / TASKS_PAGE_SIZE))} · Всего задач: {state.count}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
              <Button type="button" variant="outline" disabled={page * TASKS_PAGE_SIZE >= state.count} onClick={() => setPage(page + 1)}>Далее</Button>
            </div>
          </nav>}
        </section>
      </>}
    </div>
  )
}

export function ObjectPage({ role }: { role: CrmRole }) {
  const { id = '' } = useParams<'id'>()
  return <ObjectDetails key={`${id}:${role}`} id={id} role={role} />
}
