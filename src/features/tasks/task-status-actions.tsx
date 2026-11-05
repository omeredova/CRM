import { useId, useRef, useState } from 'react'

import type { CrmRole } from '@/features/auth/profile'
import { supabase } from '@/shared/api/supabase'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Modal, ModalForm } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import type { TaskDetails } from './task-details-types'
import { availableTaskStatuses, changeTaskStatus, type TaskActionStatus } from './task-status'

const labels: Record<TaskActionStatus, string> = {
  in_progress: 'Взять в работу',
  in_review: 'Отправить на проверку',
  accepted: 'Принять задачу',
  revision: 'Вернуть на доработку',
}

export function TaskStatusActions({ task, user, onChanged }: {
  task: TaskDetails
  user: { id: string; role: CrmRole }
  onChanged: () => void
}) {
  const [action, setAction] = useState<TaskActionStatus | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const commentId = useId()
  const actions = availableTaskStatuses(task, user)

  if (actions.length === 0) return null

  return <section aria-label="Действия с задачей" className="flex flex-wrap gap-2">
    {actions.map((status) => <Button key={status} type="button" variant={status === 'revision' ? 'outline' : 'default'}
      onClick={(event) => { trigger.current = event.currentTarget; setAction(status) }}>
      {labels[status]}
    </Button>)}
    <Modal open={action !== null} onOpenChange={(open) => { if (!open) setAction(null) }} finalFocus={trigger}
      title={action ? labels[action] : 'Изменение статуса'}
      description={action === 'revision' ? 'Укажите, что исполнителю нужно исправить.' : 'Изменение статуса будет записано в историю задачи.'}>
      <ModalForm submitLabel={action ? labels[action] : 'Подтвердить'} pendingLabel="Меняем статус…"
        onSubmit={async (form) => {
          if (!action) return 'Выберите действие.'
          const comment = form.get('comment')
          return changeTaskStatus(supabase, task.id, action, typeof comment === 'string' ? comment : '')
        }}
        onSuccess={() => { setAction(null); onChanged() }}>
        {action === 'revision' && <div className="grid gap-2">
          <Label htmlFor={commentId}>Причина возврата</Label>
          <Textarea id={commentId} name="comment" required maxLength={5000} />
        </div>}
      </ModalForm>
    </Modal>
  </section>
}
