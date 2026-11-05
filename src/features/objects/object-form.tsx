import { useId, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/shared/ui/button'
import { DialogClose } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { ConstructionObject } from './api'

export function ObjectForm({ object, onSave, onCancel, onPendingChange, submitLabel }: {
  object?: ConstructionObject
  onSave: (name: string, address: string) => Promise<string | null>
  onCancel: () => void
  onPendingChange: (pending: boolean) => void
  submitLabel: string
}) {
  const id = useId()
  const submitting = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const data = new FormData(event.currentTarget)
    const name = data.get('name')
    const address = data.get('address')
    if (typeof name !== 'string' || typeof address !== 'string' || !name.trim() || !address.trim() || name.trim().length > 300 || address.trim().length > 1000) {
      setError('Укажите название до 300 символов и адрес до 1000 символов. Поля не могут быть пустыми.')
      return
    }
    submitting.current = true
    setPending(true)
    onPendingChange(true)
    setError(null)
    try {
      setError(await onSave(name.trim(), address.trim()))
    } catch {
      setError('Не удалось сохранить объект. Попробуйте ещё раз.')
    } finally {
      submitting.current = false
      setPending(false)
      onPendingChange(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" aria-busy={pending}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`}>Название</Label>
        <Input id={`${id}-name`} name="name" defaultValue={object?.name ?? ''} required maxLength={300} disabled={pending} aria-describedby={error ? `${id}-error` : undefined} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-address`}>Адрес</Label>
        <Input id={`${id}-address`} name="address" defaultValue={object?.address ?? ''} required maxLength={1000} disabled={pending} aria-describedby={error ? `${id}-error` : undefined} />
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <DialogClose render={<Button type="button" variant="outline" onClick={onCancel} disabled={pending} />}>Отмена</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? 'Сохраняем…' : submitLabel}</Button>
      </div>
    </form>
  )
}
