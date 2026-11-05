import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { supabase } from '@/shared/api/supabase'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog, Modal } from '@/shared/ui/modal'
import type { TaskDetails } from './task-details-types'
import { TaskForm } from './task-form'
import { deleteTask, updateTask } from './task-mutations'

export function TaskActions({ task, onChanged }: { task: TaskDetails; onChanged: () => void }) {
  const [action, setAction] = useState<'edit' | 'delete' | null>(null)
  const editTrigger = useRef<HTMLButtonElement>(null)
  const deleteTrigger = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const close = (open: boolean) => { if (!open) setAction(null) }
  const title = task.title.replace(/\s+/g, ' ').trim()
  const shortTitle = title.length > 80 ? `${title.slice(0, 80).trimEnd()}…` : title

  return <div className="flex flex-wrap gap-2">
    <Button ref={editTrigger} type="button" variant="outline" onClick={() => setAction('edit')}>Редактировать задачу</Button>
    <Button ref={deleteTrigger} type="button" variant="destructive" onClick={() => setAction('delete')}>Удалить задачу</Button>
    <Modal open={action === 'edit'} onOpenChange={close} finalFocus={editTrigger} title="Редактирование задачи"
      description="Измените данные задачи. При смене объекта или исполнителя текущий статус сохраняется.">
      <TaskForm task={task} objectId={task.object_id} onSave={(input) => updateTask(supabase, task.id, input)}
        onSaved={() => { setAction(null); onChanged() }} />
    </Modal>
    <ConfirmDialog open={action === 'delete'} onOpenChange={close} finalFocus={deleteTrigger} title="Удалить задачу?"
      description={<><span className="[overflow-wrap:anywhere]">Задача «{shortTitle}» будет удалена без возможности восстановления.</span> История статусов сохранится.</>}
      onConfirm={() => deleteTask(supabase, task.id)} onConfirmed={() => navigate(`/objects/${task.object_id}`, { replace: true })}
      confirmLabel="Удалить" pendingLabel="Удаляем…" destructive />
  </div>
}
