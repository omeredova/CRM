import { Link, useParams } from 'react-router'

import { taskStatusLabels } from '@/features/tasks/api'
import { useTaskDetails } from '@/features/tasks/use-task-details'
import { TaskHistory } from '@/features/tasks/task-history'
import { Button } from '@/shared/ui/button'
import { ExpandableText } from '@/shared/ui/expandable-text'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
const linkClass = 'rounded-md text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring'

function TaskDetails({ id }: { id: string }) {
  const { state, retry } = useTaskDetails(id)
  if (state.status === 'loading') return <p role="status" className="text-sm text-muted-foreground">Загружаем задачу и историю…</p>
  if (state.status === 'not-found') return <div className="grid justify-items-start gap-4">
    <h1 className="text-xl font-semibold">Задача не найдена или недоступна</h1>
    <p className="text-sm text-muted-foreground">Задача могла быть удалена, либо у вас нет доступа к ней.</p>
    <Link to="/" className={linkClass}>К объектам</Link>
  </div>
  if (state.status === 'error') return <div className="grid justify-items-start gap-4">
    <h1 className="text-xl font-semibold">Не удалось открыть задачу</h1>
    <p role="alert" className="text-sm text-destructive">{state.error}</p>
    <Button type="button" variant="outline" onClick={retry}>Повторить</Button>
    <Link to="/" className={linkClass}>К объектам</Link>
  </div>
  const { task, object, history, names } = state
  const person = (personId: string) => names[personId] || `Пользователь ${personId}`
  return <article className="grid min-w-0 gap-6">
    <Link to={`/objects/${object.id}`} className={`${linkClass} w-fit`}>← К объекту</Link>
    <header className="grid min-w-0 gap-2">
      <h1 className="min-w-0 text-xl font-semibold"><ExpandableText text={task.title} label="Название задачи" previewLength={120} /></h1>
      <p className="text-sm text-muted-foreground">{taskStatusLabels[task.status]}</p>
    </header>
    <dl className="grid min-w-0 gap-4 rounded-xl border bg-card p-4 text-sm sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-muted-foreground">Объект</dt><dd className="break-words"><Link className={linkClass} to={`/objects/${object.id}`}>{object.name}</Link></dd></div>
      <div className="min-w-0"><dt className="text-muted-foreground">Адрес объекта</dt><dd className="whitespace-pre-wrap break-words">{object.address}</dd></div>
      <div className="min-w-0"><dt className="text-muted-foreground">Исполнитель</dt><dd className="break-words">{person(task.assignee_id)}</dd></div>
      <div className="min-w-0"><dt className="text-muted-foreground">Автор</dt><dd className="break-words">{person(task.author_id)}</dd></div>
      <div><dt className="text-muted-foreground">Дата создания</dt><dd><time dateTime={task.created_at}>{dateFormat.format(new Date(task.created_at))}</time></dd></div>
      <div className="min-w-0 sm:col-span-2"><dt className="text-muted-foreground">Описание</dt><dd><ExpandableText text={task.description.trim() ? task.description : 'Описание не указано.'} label="Описание задачи" /></dd></div>
    </dl>
    <TaskHistory history={history} names={names} />
  </article>
}

export function TaskPage() {
  const { id = '' } = useParams<'id'>()
  return <TaskDetails key={id} id={id} />
}
