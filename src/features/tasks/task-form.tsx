import { useEffect, useId, useState } from 'react'

import type { ConstructionObject } from '@/features/objects/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { ModalForm } from '@/shared/ui/modal'
import { NativeSelect } from '@/shared/ui/native-select'
import { Textarea } from '@/shared/ui/textarea'
import { getExecutors, type Executor, type CreateTaskInput } from './api'
import { getTaskObjectOptions } from './task-object-options'
import type { TaskDetails } from './task-details-types'

type ExecutorsState =
  | { status: 'loading' }
  | { status: 'success'; executors: Executor[] }
  | { status: 'error'; error: string }

export function TaskForm({ objectId, task, onSave, onSaved }: {
  objectId: string
  task?: TaskDetails
  onSave: (input: CreateTaskInput) => Promise<string | null>
  onSaved: () => void
}) {
  const id = useId()
  const [objects, setObjects] = useState<
    { status: 'loading' } | { status: 'success'; objects: ConstructionObject[] } | { status: 'error'; error: string }
  >({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [executors, setExecutors] = useState<ExecutorsState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    void getExecutors(controller.signal).then((result) => {
      if (!controller.signal.aborted) setExecutors(result)
    })
    if (task) void getTaskObjectOptions(controller.signal).then((result) => {
      if (!controller.signal.aborted) setObjects(result)
    })
    return () => controller.abort()
  }, [attempt, task])

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
    const selectedObject = task ? form.get('object') : objectId
    if (typeof selectedObject !== 'string' || (task && (objects.status !== 'success' || !objects.objects.some((object) => object.id === selectedObject)))) {
      return 'Выберите объект из списка.'
    }
    return onSave({ title, description, assigneeId, objectId: selectedObject })
  }

  const canSubmit = executors.status === 'success' && executors.executors.length > 0 && (!task || (objects.status === 'success' && objects.objects.length > 0))

  return (
    <ModalForm onSubmit={submit} onSuccess={onSaved} submitLabel={task ? 'Сохранить' : 'Создать задачу'} pendingLabel={task ? 'Сохраняем…' : 'Создаём…'} disabled={!canSubmit}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-title`}>Название</Label>
        <Input id={`${id}-title`} name="title" defaultValue={task?.title} required maxLength={300} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-description`}>Описание (необязательно)</Label>
        <Textarea id={`${id}-description`} name="description" defaultValue={task?.description} maxLength={20000} />
      </div>
      {task && <div className="grid min-w-0 gap-2">
        <Label htmlFor={`${id}-object`}>Объект</Label>
        <NativeSelect key={objects.status} id={`${id}-object`} name="object" defaultValue={task.object_id} required disabled={objects.status !== 'success'}>
          <option value="" disabled>Выберите объект</option>
          {objects.status === 'success' && !objects.objects.some((object) => object.id === task.object_id) && <option value={task.object_id} disabled>Текущий объект недоступен — выберите другой</option>}
          {objects.status === 'success' && objects.objects.map((object) => <option key={object.id} value={object.id}>{object.name} · {object.address}</option>)}
        </NativeSelect>
        {objects.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Загружаем объекты…</p>}
        {objects.status === 'success' && objects.objects.length === 0 && <p role="status" className="text-sm text-muted-foreground">Нет доступных объектов.</p>}
        {objects.status === 'error' && <div className="grid justify-items-start gap-2">
          <p role="alert" className="text-sm text-destructive">{objects.error}</p>
          <Button type="button" variant="outline" onClick={() => { setObjects({ status: 'loading' }); setAttempt((value) => value + 1) }}>Повторить</Button>
        </div>}
      </div>}
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`${id}-assignee`}>Исполнитель</Label>
        <NativeSelect key={executors.status} id={`${id}-assignee`} name="assignee" defaultValue={task?.assignee_id ?? ''} required disabled={executors.status !== 'success'} aria-describedby={`${id}-executors`}>
          <option value="" disabled>Выберите исполнителя</option>
          {task && executors.status === 'success' && !executors.executors.some((executor) => executor.id === task.assignee_id) && <option value={task.assignee_id} disabled>Текущий исполнитель недоступен — выберите другого</option>}
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
