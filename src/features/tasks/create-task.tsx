import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { NativeSelect } from '@/shared/ui/native-select'
import { Textarea } from '@/shared/ui/textarea'
import { createTask, getExecutors, type Executor } from './api'

type ExecutorsState =
  | { status: 'loading' }
  | { status: 'success'; executors: Executor[] }
  | { status: 'error'; error: string }

function CreateTaskForm({ objectId, onCreated, onPendingChange }: {
  objectId: string
  onCreated: () => void
  onPendingChange: (value: boolean) => void
}) {
  const id = useId()
  const [attempt, setAttempt] = useState(0)
  const [executors, setExecutors] = useState<ExecutorsState>({ status: 'loading' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    void getExecutors(controller.signal).then((result) => {
      if (!controller.signal.aborted) setExecutors(result)
    })
    return () => controller.abort()
  }, [attempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || executors.status !== 'success') return
    const form = new FormData(event.currentTarget)
    const title = form.get('title')
    const description = form.get('description')
    const assigneeId = form.get('assignee')
    if (typeof title !== 'string' || typeof description !== 'string' || typeof assigneeId !== 'string') {
      setError('Проверьте заполнение полей задачи.')
      return
    }
    if (!executors.executors.some((executor) => executor.id === assigneeId)) {
      setError('Выберите исполнителя из списка.')
      return
    }
    submitting.current = true
    setPending(true)
    onPendingChange(true)
    setError(null)
    try {
      const failure = await createTask({ title, description, assigneeId, objectId })
      if (failure) setError(failure)
      else onCreated()
    } finally {
      submitting.current = false
      setPending(false)
      onPendingChange(false)
    }
  }

  const canSubmit = executors.status === 'success' && executors.executors.length > 0 && !pending

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4" aria-busy={pending}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-title`}>Название</Label>
        <Input id={`${id}-title`} name="title" required maxLength={300} disabled={pending} aria-describedby={error ? `${id}-error` : undefined} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-description`}>Описание (необязательно)</Label>
        <Textarea id={`${id}-description`} name="description" maxLength={20000} disabled={pending} />
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
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Отмена</DialogClose>
        <Button type="submit" disabled={!canSubmit}>{pending ? 'Создаём…' : 'Создать задачу'}</Button>
      </div>
    </form>
  )
}

export function CreateTask({ objectId, onCreated }: { objectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const pending = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <Button ref={trigger} type="button" onClick={() => setOpen(true)}>Создать задачу</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!pending.current) setOpen(next) }}>
      <DialogContent finalFocus={trigger} className="grid gap-4">
        <DialogTitle>Создание задачи</DialogTitle>
        <DialogDescription>Задача будет добавлена к текущему объекту со статусом «Новая».</DialogDescription>
        {open && <CreateTaskForm objectId={objectId} onPendingChange={(value) => { pending.current = value }} onCreated={() => { setOpen(false); onCreated() }} />}
      </DialogContent>
    </Dialog>
  </>
}
