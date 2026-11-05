import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { ExpandableText } from '@/shared/ui/expandable-text'
import { taskStatusLabels } from './api'
import type { HistoryEntry } from './task-details-types'

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

export function TaskHistory({ history, names }: {
  history: HistoryEntry[]
  names: Record<string, string>
}) {
  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-xl border bg-card" aria-labelledby="task-history-title">
      <h2 id="task-history-title" className="px-4 pt-4 text-lg font-semibold">История статусов</h2>
      {history.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Записей в истории пока нет.</p>
      ) : (
        <div role="region" aria-label="Таблица истории статусов" tabIndex={0}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <Table className="min-w-xl table-fixed">
            <caption className="sr-only">Изменения статуса задачи, сначала новые</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Изменение</TableHead>
                <TableHead>Участник</TableHead>
                <TableHead>Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="align-top"><time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time></TableCell>
                  <TableCell className="align-top font-medium">
                    {entry.from_status === null ? 'Создание задачи' : taskStatusLabels[entry.from_status]} → {taskStatusLabels[entry.to_status]}
                  </TableCell>
                  <TableCell className="break-words align-top">{names[entry.actor_id] || `Пользователь ${entry.actor_id}`}</TableCell>
                  <TableCell className="align-top"><ExpandableText text={entry.comment || '—'} label={`Комментарий от ${dateFormat.format(new Date(entry.created_at))}`} previewLength={160} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
