import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Modal, ModalForm } from '@/shared/ui/modal'
import { NativeSelect } from '@/shared/ui/native-select'
import { Textarea } from '@/shared/ui/textarea'
import { createTask, getExecutors, type Executor } from './api'

type ExecutorsState =
  | { status: 'loading' }
  | { status: 'success'; executors: Executor[] }
  | { status: 'error'; error: string }

function CreateTaskForm({ objectId, onCreated }: {
  objectId: string
  onCreated: () => void
}) {
  const id = useId()
  const [attempt, setAttempt] = useState(0)
  const [executors, setExecutors] = useState<ExecutorsState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    void getExecutors(controller.signal).then((result) => {
      if (!controller.signal.aborted) setExecutors(result)
    })
    return () => controller.abort()
  }, [attempt])

  async function submit(form: FormData) {
    if (executors.status !== 'success') return 'Дождитесь загрузки исполнителей.'
    const title = form.get('title')
    const description = form.get('description')
    const assigneeId = form.get('assignee')
    if (typeof title !== 'string' || typeof description !== 'string' || typeof assigneeId !== 'string') {
      return 'Проверьте заполнение полей задачи.'
    }
    if (!executors.executors.some((executor) => executor.id === assigneeId)) {
      return 'Выберите исполнителя из списка.'
    }
    return createTask({ title, description, assigneeId, objectId })
  }

  const canSubmit = executors.status === 'success' && executors.executors.length > 0

  return (
    <ModalForm onSubmit={submit} onSuccess={onCreated} submitLabel="Создать задачу" pendingLabel="Создаём…" disabled={!canSubmit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-title`}>Название</Label>
        <Input id={`${id}-title`} name="title" required maxLength={300} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-description`}>Описание (необязательно)</Label>
        <Textarea id={`${id}-description`} name="description" maxLength={20000} />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`${id}-assignee`}>Исполнитель</Label>
        <NativeSelect id={`${id}-assignee`} name="assignee" defaultValue="" required disabled={!canSubmit} aria-describedby={`${id}-executors`}>
          <option value="" disabled>Выберите исполнителя</option>
          {executors.status === 'success' && executors.executors.map((executor) => {
            const name = executor.full_name.trim()
            return <option key={executor.id} value={executor.id}>{name ? `${name} · ${executor.email || 'Email не указан'}` : executor.email || 'Имя и email не указаны'}</option>
          })}
        </NativeSelect>
        <div id={`${id}-executors`}>
          {executors.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Загружаем исполнителей…</p>}
          {executors.status === 'success' && executors.executors.length === 0 && <p role="status" className="text-sm text-muted-foreground">Исполнителей пока нет. Для создания задачи нужен пользователь с ролью «Исполнитель».</p>}
          {executors.status === 'error' && <div className="grid justify-items-start gap-2">
            <p role="alert" className="text-sm text-destructive">{executors.error}</p>
            <Button type="button" variant="outline" onClick={() => { setExecutors({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</Button>
          </div>}
        </div>
      </div>
    </ModalForm>
  )
}

export function CreateTask({ objectId, onCreated }: { objectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <Button ref={trigger} type="button" onClick={() => setOpen(true)}>Создать задачу</Button>
    <Modal open={open} onOpenChange={setOpen} finalFocus={trigger} title="Создание задачи"
      description="Задача будет добавлена к текущему объекту со статусом «Новая».">
      <CreateTaskForm objectId={objectId} onCreated={() => { setOpen(false); onCreated() }} />
    </Modal>
  </>
}
