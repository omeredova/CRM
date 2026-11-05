import { useState } from 'react'
import { Link } from 'react-router'

import { TASKS_PAGE_SIZE, taskStatusLabels } from '@/features/tasks/api'
import { useExecutorTasks } from '@/features/tasks/use-executor-tasks'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const linkClass = 'rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring'

export function TasksPage({ userId }: { userId: string }) {
  const [page, setPage] = useState(1)
  const { state, retry } = useExecutorTasks(userId, page, setPage)

  return <section className="grid min-w-0 gap-6" aria-labelledby="my-tasks-title">
    <header className="grid gap-2">
      <h1 id="my-tasks-title" className="text-xl font-semibold">Мои задачи</h1>
      <p className="text-sm text-muted-foreground">Все назначенные вам задачи, включая принятые. Сначала новые по дате создания.</p>
    </header>
    <div aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Загружаем задачи…</p>}
      {state.status === 'error' && <div className="grid justify-items-start gap-4">
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
        <Button type="button" variant="outline" onClick={retry}>Повторить</Button>
      </div>}
      {state.status === 'success' && (state.tasks.length === 0
        ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">У вас пока нет назначенных задач.</p>
        : <div className="overflow-hidden rounded-xl border">
          <Table className="table-fixed">
            <caption className="sr-only">Назначенные вам задачи, их объекты и статусы</caption>
            <TableHeader><TableRow>
              <TableHead>Задача</TableHead><TableHead>Объект</TableHead><TableHead className="w-28 sm:w-44">Статус</TableHead>
            </TableRow></TableHeader>
            <TableBody>{state.tasks.map((task) => <TableRow key={task.id}>
              <TableCell className="align-top font-medium"><Link to={`/tasks/${task.id}`} className={`${linkClass} line-clamp-3 [overflow-wrap:anywhere]`} title={task.title}>{task.title}</Link></TableCell>
              <TableCell className="align-top"><Link to={`/objects/${task.object.id}`} className={`${linkClass} line-clamp-3 [overflow-wrap:anywhere]`} title={task.object.name}>{task.object.name}</Link></TableCell>
              <TableCell><span className="inline-flex rounded-md border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{taskStatusLabels[task.status]}</span></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>)}
    </div>
    <nav aria-label="Страницы моих задач" className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-muted-foreground">{state.status === 'success'
        ? `Страница ${page} из ${Math.max(1, Math.ceil(state.count / TASKS_PAGE_SIZE))} · Всего задач: ${state.count}`
        : `Страница ${page}`}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={state.status !== 'success' || page <= 1} onClick={() => setPage(page - 1)}>Назад</Button>
        <Button type="button" variant="outline" disabled={state.status !== 'success' || page * TASKS_PAGE_SIZE >= state.count} onClick={() => setPage(page + 1)}>Далее</Button>
      </div>
    </nav>
  </section>
}
